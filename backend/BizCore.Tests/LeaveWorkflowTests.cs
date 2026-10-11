using BizCore.Application.Common.Exceptions;
using BizCore.Application.HR.Leaves;
using BizCore.Application.HR.Attendance;
using BizCore.Application.HR.Overview;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Tests;
public class LeaveWorkflowTests
{
    private static DateOnly Weekday()
    {
        var day = new DateOnly(DateTime.UtcNow.Year + 1, 1, 5);
        while (day.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) day = day.AddDays(1);
        return day;
    }
    private static async Task<LeaveType> AddType(EmployeeFixture f, int days = 10)
    {
        var type = new LeaveType { Id = Guid.NewGuid(), CompanyId = f.Own.CompanyId, Name = "Annual", DaysAllowed = days };
        f.Db.LeaveTypes.Add(type); await f.Db.SaveChangesAsync(); return type;
    }
    private static async Task BecomeAdmin(EmployeeFixture f)
    {
        var admin = new User { Id = Guid.NewGuid(), CompanyId = f.Own.CompanyId, Company = f.User.Company,
            FirstName = "Company", LastName = "Admin", Role = UserRole.CompanyAdmin };
        f.Db.Users.Add(admin); await f.Db.SaveChangesAsync(); f.Current.UserId = admin.Id; f.Current.EmployeeId = null;
    }
    [Fact]
    public async Task Pending_requests_reserve_balance_and_admin_without_employee_can_review_once()
    {
        await using var f = new EmployeeFixture(); var type = await AddType(f, 1); var day = Weekday();
        var apply = new ApplyLeaveCommandHandler(f.Db, f.Current);
        var first = await apply.Handle(new(f.Own.Id, type.Id, day, day, "Appointment"), default);
        Assert.True(first.IsSuccess);
        var balances = await new GetLeaveBalancesQueryHandler(f.Db, f.Current).Handle(new(f.Own.Id, day.Year), default);
        Assert.Equal(0, balances.Data!.Single().AvailableDays);
        var secondDay = day.AddDays(7);
        var second = await apply.Handle(new(f.Own.Id, type.Id, secondDay, secondDay, "Another appointment"), default);
        Assert.False(second.IsSuccess);
        await BecomeAdmin(f);
        var review = new DecideLeaveCommandHandler(f.Db, f.Current);
        Assert.True((await review.Handle(new(first.Data!.Id, true), default)).IsSuccess);
        Assert.False((await review.Handle(new(first.Data.Id, true), default)).IsSuccess);
        Assert.Equal(1, (await f.Db.LeaveBalances.SingleAsync()).UsedDays);
        var request = await f.Db.LeaveRequests.SingleAsync();
        Assert.Equal(f.Current.UserId, request.ReviewedByUserId);
        Assert.Equal("Company Admin", request.ReviewedByName);
    }
    [Fact]
    public async Task Rejection_and_cancellation_release_pending_days()
    {
        await using var f = new EmployeeFixture(); var type = await AddType(f, 1); var day = Weekday();
        var apply = new ApplyLeaveCommandHandler(f.Db, f.Current);
        var first = await apply.Handle(new(f.Own.Id, type.Id, day, day, "Appointment"), default);
        await new CancelLeaveCommandHandler(f.Db, f.Current).Handle(new(first.Data!.Id), default);
        var second = await apply.Handle(new(f.Own.Id, type.Id, day, day, "Resubmitted"), default);
        Assert.True(second.IsSuccess);
        await BecomeAdmin(f);
        Assert.False((await new DecideLeaveCommandHandler(f.Db, f.Current).Handle(new(second.Data!.Id, false, " "), default)).IsSuccess);
        Assert.True((await new DecideLeaveCommandHandler(f.Db, f.Current).Handle(new(second.Data.Id, false, "Please choose another date"), default)).IsSuccess);
        Assert.Equal(0, (await f.Db.LeaveBalances.SingleAsync()).UsedDays);
    }
    [Fact]
    public async Task Cannot_self_approve_apply_for_others_or_review_another_company()
    {
        await using var f = new EmployeeFixture(); var type = await AddType(f); var day = Weekday();
        var apply = new ApplyLeaveCommandHandler(f.Db, f.Current);
        var request = await apply.Handle(new(f.Own.Id, type.Id, day, day, "Appointment"), default);
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => new DecideLeaveCommandHandler(f.Db, f.Current).Handle(new(request.Data!.Id, true), default));
        f.User.Role = UserRole.Manager; await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => new DecideLeaveCommandHandler(f.Db, f.Current).Handle(new(request.Data!.Id, true), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => apply.Handle(new(f.Other.Id, type.Id, day, day, "Someone else"), default));
        var foreign = new LeaveRequest { Id = Guid.NewGuid(), CompanyId = Guid.NewGuid(), EmployeeId = Guid.NewGuid() };
        f.Db.LeaveRequests.Add(foreign); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<NotFoundException>(() => new DecideLeaveCommandHandler(f.Db, f.Current).Handle(new(foreign.Id, true), default));
    }
    [Fact]
    public async Task Invalid_ranges_and_overlaps_are_rejected()
    {
        await using var f = new EmployeeFixture(); var type = await AddType(f); var day = Weekday();
        var apply = new ApplyLeaveCommandHandler(f.Db, f.Current);
        Assert.False((await apply.Handle(new(f.Own.Id, type.Id, day, day.AddYears(1), "Cross year"), default)).IsSuccess);
        Assert.False((await apply.Handle(new(f.Own.Id, type.Id, day, day.AddDays(-1), "Reversed"), default)).IsSuccess);
        Assert.True((await apply.Handle(new(f.Own.Id, type.Id, day, day, "First"), default)).IsSuccess);
        Assert.False((await apply.Handle(new(f.Own.Id, type.Id, day, day, "Overlap"), default)).IsSuccess);
    }
    [Fact]
    public async Task Dashboard_is_scoped_and_export_requires_manager()
    {
        await using var f = new EmployeeFixture();
        var personal = await new GetOverviewQueryHandler(f.Db, f.Current).Handle(new(), default);
        Assert.Equal("personal", personal.Scope);
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => new ExportAttendanceQueryHandler(f.Db, f.Current).Handle(new(Weekday(), Weekday(), null), default));
        await BecomeAdmin(f);
        f.Db.Employees.Add(new Employee { Id = Guid.NewGuid(), CompanyId = Guid.NewGuid() }); await f.Db.SaveChangesAsync();
        var company = await new GetOverviewQueryHandler(f.Db, f.Current).Handle(new(), default);
        Assert.Equal(2, company.ActiveEmployees);
    }
    [Theory]
    [InlineData("=HYPERLINK(\"bad\")")]
    [InlineData(" +formula")]
    [InlineData("@formula")]
    public void Csv_protects_against_formula_injection(string input) => Assert.StartsWith("\"'", ExportAttendanceQueryHandler.Cell(input));
}
