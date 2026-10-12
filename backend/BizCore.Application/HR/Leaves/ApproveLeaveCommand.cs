namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.Access;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record DecideLeaveCommand(Guid LeaveRequestId, bool Approve, string? RejectionReason = null) : IRequest<Result>;

public class DecideLeaveCommandHandler(IApplicationDbContext db, ICurrentUserService current)
    : IRequestHandler<DecideLeaveCommand, Result>
{
    public async Task<Result> Handle(DecideLeaveCommand command, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        if (!EmployeeAccess.CanManage(caller)) throw new ForbiddenAccessException("Only administrators and managers can review leave.");
        if (!command.Approve && (string.IsNullOrWhiteSpace(command.RejectionReason) || command.RejectionReason.Trim().Length > 500))
            return Result.Failure("Enter a rejection reason of 1–500 characters.");
        var employeeId = await db.LeaveRequests.AsNoTracking().Where(x => x.Id == command.LeaveRequestId &&
            x.CompanyId == caller.CompanyId).Select(x => (Guid?)x.EmployeeId).SingleOrDefaultAsync(ct)
            ?? throw new NotFoundException("Leave request", command.LeaveRequestId);
        return await db.WithEmployeeLockAsync(employeeId, async () =>
        {
            var request = await db.LeaveRequests.Include(x => x.Employee).SingleAsync(x =>
                x.Id == command.LeaveRequestId && x.CompanyId == caller.CompanyId, ct);
            if (caller.EmployeeId == request.EmployeeId || request.Employee.UserId == caller.Id)
                throw new ForbiddenAccessException("You cannot review your own leave request.");
            if (request.Status != LeaveStatus.Pending) return Result.Failure("This request has already been reviewed or cancelled.", 409);
            if (command.Approve)
            {
                var balance = await db.LeaveBalances.SingleOrDefaultAsync(x => x.CompanyId == caller.CompanyId &&
                    x.EmployeeId == request.EmployeeId && x.LeaveTypeId == request.LeaveTypeId && x.Year == request.StartDate.Year, ct);
                if (balance == null || balance.TotalDays - balance.UsedDays < request.TotalDays)
                    return Result.Failure("The employee has insufficient leave balance.", 409);
                if (!request.Employee.IsActive) return Result.Failure("This employee is inactive.", 409);
                balance.UsedDays += request.TotalDays;
            }
            request.Status = command.Approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
            request.ApprovedAt = DateTime.UtcNow;
            request.ReviewedByUserId = caller.Id;
            request.ReviewedByName = $"{caller.FirstName} {caller.LastName}".Trim();
            request.RejectionReason = command.Approve ? null : command.RejectionReason!.Trim();
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }, ct);
    }
}

public record CancelLeaveCommand(Guid Id) : IRequest<Result>;
public class CancelLeaveCommandHandler(IApplicationDbContext db, ICurrentUserService current) : IRequestHandler<CancelLeaveCommand, Result>
{
    public async Task<Result> Handle(CancelLeaveCommand command, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        var own = await EmployeeAccess.RequireAsync(db, caller, null, ct);
        return await db.WithEmployeeLockAsync(own.Id, async () =>
        {
            var request = await db.LeaveRequests.SingleOrDefaultAsync(x => x.Id == command.Id &&
                x.CompanyId == caller.CompanyId && x.EmployeeId == own.Id, ct)
                ?? throw new NotFoundException("Leave request", command.Id);
            if (request.Status != LeaveStatus.Pending) return Result.Failure("Only pending requests can be cancelled.", 409);
            request.Status = LeaveStatus.Cancelled;
            await db.SaveChangesAsync(ct);
            return Result.Success();
        }, ct);
    }
}
