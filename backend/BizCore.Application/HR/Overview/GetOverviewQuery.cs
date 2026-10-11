namespace BizCore.Application.HR.Overview;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.HR.Access;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record OverviewResponse(string Scope, DateOnly Date, int ActiveEmployees, int Departments,
    int ClockInsToday, int PendingRequests, int OnLeaveToday, int AttendanceDaysThisMonth,
    int ApprovedDaysThisYear, bool HasEmployeeProfile);
public record GetOverviewQuery : IRequest<OverviewResponse>;
public class GetOverviewQueryHandler(IApplicationDbContext db, ICurrentUserService current) : IRequestHandler<GetOverviewQuery, OverviewResponse>
{
    public async Task<OverviewResponse> Handle(GetOverviewQuery query, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        var date = DateOnly.FromDateTime(DateTime.UtcNow);
        var attendance = db.Attendances.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId);
        var leaves = db.LeaveRequests.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId);
        if (EmployeeAccess.CanManage(caller))
            return new("company", date,
                await db.Employees.CountAsync(x => x.CompanyId == caller.CompanyId && x.IsActive, ct),
                await db.Departments.CountAsync(x => x.CompanyId == caller.CompanyId, ct),
                await attendance.Where(x => x.Date == date).Select(x => x.EmployeeId).Distinct().CountAsync(ct),
                await leaves.CountAsync(x => x.Status == LeaveStatus.Pending, ct),
                date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? 0 :
                    await leaves.Where(x => x.Status == LeaveStatus.Approved && x.StartDate <= date && x.EndDate >= date)
                        .Select(x => x.EmployeeId).Distinct().CountAsync(ct), 0, 0, caller.EmployeeId.HasValue);
        if (!caller.EmployeeId.HasValue) return new("personal", date, 0, 0, 0, 0, 0, 0, 0, false);
        var own = await EmployeeAccess.RequireAsync(db, caller, null, ct);
        attendance = attendance.Where(x => x.EmployeeId == own.Id);
        leaves = leaves.Where(x => x.EmployeeId == own.Id);
        return new("personal", date, 0, 0,
            await attendance.CountAsync(x => x.Date == date, ct),
            await leaves.CountAsync(x => x.Status == LeaveStatus.Pending, ct), 0,
            await attendance.CountAsync(x => x.Date.Year == date.Year && x.Date.Month == date.Month, ct),
            await leaves.Where(x => x.StartDate.Year == date.Year && x.Status == LeaveStatus.Approved).SumAsync(x => x.TotalDays, ct), true);
    }
}
