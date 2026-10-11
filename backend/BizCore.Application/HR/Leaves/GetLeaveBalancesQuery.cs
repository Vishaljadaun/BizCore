namespace BizCore.Application.HR.Leaves;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.Access;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetLeaveBalancesQuery(Guid EmployeeId, int? Year = null) : IRequest<Result<List<LeaveBalanceResponse>>>;
public class GetLeaveBalancesQueryHandler(IApplicationDbContext db, ICurrentUserService current)
    : IRequestHandler<GetLeaveBalancesQuery, Result<List<LeaveBalanceResponse>>>
{
    public async Task<Result<List<LeaveBalanceResponse>>> Handle(GetLeaveBalancesQuery query, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        await EmployeeAccess.RequireAsync(db, caller, query.EmployeeId, ct);
        var year = query.Year ?? DateTime.UtcNow.Year;
        var types = await db.LeaveTypes.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId && x.IsActive).OrderBy(x => x.Name).ToListAsync(ct);
        var balances = await db.LeaveBalances.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId && x.EmployeeId == query.EmployeeId && x.Year == year).ToListAsync(ct);
        var pending = await db.LeaveRequests.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId && x.EmployeeId == query.EmployeeId && x.StartDate.Year == year && x.Status == LeaveStatus.Pending).ToListAsync(ct);
        return Result<List<LeaveBalanceResponse>>.Success(types.Select(type => {
            var balance = balances.SingleOrDefault(x => x.LeaveTypeId == type.Id);
            var total = balance?.TotalDays ?? type.DaysAllowed;
            var used = balance?.UsedDays ?? 0;
            var reserved = pending.Where(x => x.LeaveTypeId == type.Id).Sum(x => x.TotalDays);
            return new LeaveBalanceResponse(type.Id, type.Name, total, used, total - used, year, reserved, Math.Max(0, total - used - reserved));
        }).ToList());
    }
}
