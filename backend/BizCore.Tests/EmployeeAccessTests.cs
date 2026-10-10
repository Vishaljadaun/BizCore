using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.HR.Attendance;
using BizCore.Application.HR.Employees;
using BizCore.Application.HR.Leaves;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using BizCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Tests;

public class EmployeeAccessTests
{
    [Fact]
    public async Task Employee_can_clock_in_out_and_read_own_attendance()
    {
        await using var f = new EmployeeFixture();
        var clockIn = await new ClockInCommandHandler(f.Db, f.Current).Handle(new(), default);
        Assert.True(clockIn.IsSuccess);
        var duplicate = await new ClockInCommandHandler(f.Db, f.Current).Handle(new(), default);
        Assert.False(duplicate.IsSuccess);
        var result = await new GetAttendanceQueryHandler(f.Db, f.Current).Handle(new(), default);
        Assert.Single(result.Data!.Items);
        Assert.Equal(f.Own.Id, result.Data.Items.Single().EmployeeId);
        var clockOut = await new ClockOutCommandHandler(f.Db, f.Current).Handle(new(), default);
        Assert.True(clockOut.IsSuccess);
        Assert.NotNull(clockOut.Data!.ClockOut);
    }

    [Fact]
    public async Task Employee_cannot_clock_in_out_or_read_coworkers_records()
    {
        await using var f = new EmployeeFixture();
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new ClockInCommandHandler(f.Db, f.Current).Handle(new(f.Other.Id), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new ClockOutCommandHandler(f.Db, f.Current).Handle(new(f.Other.Id), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new GetAttendanceQueryHandler(f.Db, f.Current).Handle(new(f.Other.Id), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new GetLeaveBalancesQueryHandler(f.Db, f.Current).Handle(new(f.Other.Id), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new GetLeaveRequestsQueryHandler(f.Db, f.Current).Handle(new(f.Other.Id), default));
        Assert.Empty(await f.Db.Attendances.ToListAsync());
    }

    [Fact]
    public async Task Manager_can_record_same_company_attendance_but_not_another_company()
    {
        await using var f = new EmployeeFixture();
        f.User.Role = UserRole.Manager;
        await f.Db.SaveChangesAsync();
        Assert.True((await new ClockInCommandHandler(f.Db, f.Current).Handle(new(f.Other.Id), default)).IsSuccess);
        var outsider = new Employee { Id = Guid.NewGuid(), CompanyId = Guid.NewGuid() };
        f.Db.Employees.Add(outsider);
        await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<NotFoundException>(() =>
            new ClockOutCommandHandler(f.Db, f.Current).Handle(new(outsider.Id), default));
        await Assert.ThrowsAsync<NotFoundException>(() =>
            new GetAttendanceQueryHandler(f.Db, f.Current).Handle(new(outsider.Id), default));
    }

    [Fact]
    public async Task Unlink_takes_effect_even_with_old_employee_claim()
    {
        await using var f = new EmployeeFixture();
        f.User.EmployeeId = null;
        f.Own.UserId = null;
        await f.Db.SaveChangesAsync();
        Assert.NotNull(f.Current.EmployeeId); // stale access token
        await Assert.ThrowsAsync<NotFoundException>(() =>
            new ClockInCommandHandler(f.Db, f.Current).Handle(new(), default));
        await Assert.ThrowsAsync<NotFoundException>(() =>
            new GetMyEmployeeProfileQueryHandler(f.Db, f.Current).Handle(new(), default));
    }

    [Fact]
    public async Task New_link_is_visible_without_waiting_for_token_refresh()
    {
        await using var f = new EmployeeFixture();
        f.Current.EmployeeId = null;
        var profile = await new GetMyEmployeeProfileQueryHandler(f.Db, f.Current).Handle(new(), default);
        Assert.Equal(f.Own.Id, profile.Data!.Id);
    }

    [Theory]
    [InlineData("user")]
    [InlineData("company")]
    [InlineData("vendor")]
    public async Task Inactive_accounts_and_vendors_cannot_use_employee_endpoints(string reason)
    {
        await using var f = new EmployeeFixture();
        if (reason == "user") f.User.IsActive = false;
        if (reason == "company") f.User.Company.IsActive = false;
        if (reason == "vendor") f.User.Role = UserRole.Vendor;
        await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<ForbiddenAccessException>(() =>
            new ClockInCommandHandler(f.Db, f.Current).Handle(new(), default));
    }

    [Fact]
    public async Task User_filter_is_evaluated_per_context_and_keeps_inactive_tenant_users_visible()
    {
        await using var f = new EmployeeFixture();
        var otherCompany = Guid.NewGuid();
        f.Db.Users.Add(new User { Id = Guid.NewGuid(), CompanyId = otherCompany });
        f.User.IsActive = false;
        await f.Db.SaveChangesAsync();
        // The same EF model is reused for anonymous, tenant, and platform contexts.
        await using var anonymous = new BizCoreDbContext(f.Options, new TestCurrentUser());
        Assert.Empty(await anonymous.Users.ToListAsync());
        await using var tenant = new BizCoreDbContext(f.Options, f.Current);
        Assert.Equal(f.User.Id, (await tenant.Users.SingleAsync()).Id);
        await using var secondTenant = new BizCoreDbContext(f.Options, new TestCurrentUser { CompanyId = otherCompany });
        Assert.Equal(otherCompany, (await secondTenant.Users.SingleAsync()).CompanyId);
        await using var platform = new BizCoreDbContext(f.Options, new TestCurrentUser { UserRole = "SuperAdmin" });
        Assert.Equal(2, await platform.Users.CountAsync());
    }
}

internal sealed class TestCurrentUser : ICurrentUserService
{
    public Guid? UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public string? UserRole { get; set; } = "Employee";
    public string? IpAddress => null;
    public Guid? EmployeeId { get; set; }
}

internal sealed class EmployeeFixture : IAsyncDisposable
{
    public DbContextOptions<BizCoreDbContext> Options { get; }
    public BizCoreDbContext Db { get; }
    public TestCurrentUser Current { get; }
    public User User { get; }
    public Employee Own { get; }
    public Employee Other { get; }
    public EmployeeFixture()
    {
        var company = new Company { Id = Guid.NewGuid(), Name = "Test", Slug = "test" };
        var department = new Department { Id = Guid.NewGuid(), CompanyId = company.Id, Name = "Engineering" };
        User = new User { Id = Guid.NewGuid(), CompanyId = company.Id, Company = company, Role = UserRole.Employee };
        Own = new Employee { Id = Guid.NewGuid(), CompanyId = company.Id, UserId = User.Id, User = User,
            DepartmentId = department.Id, Department = department, FirstName = "Test", LastName = "Employee" };
        Other = new Employee { Id = Guid.NewGuid(), CompanyId = company.Id, DepartmentId = department.Id,
            Department = department, FirstName = "Another", LastName = "Employee" };
        User.EmployeeId = Own.Id;
        Current = new TestCurrentUser { UserId = User.Id, CompanyId = company.Id, EmployeeId = Own.Id };
        Options = new DbContextOptionsBuilder<BizCoreDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        Db = new BizCoreDbContext(Options, Current);
        Db.AddRange(company, department, User, Own, Other);
        Db.SaveChanges();
    }
    public ValueTask DisposeAsync() => Db.DisposeAsync();
}
