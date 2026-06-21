namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Enums;
using BizCore.Domain.Events.HR;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Approve Leave ─────────────────────────────────────
public record ApproveLeaveCommand(
    Guid LeaveRequestId,
    Guid ApproverEmployeeId
) : IRequest<Result>;

public class ApproveLeaveCommandHandler
    : IRequestHandler<ApproveLeaveCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPublisher _publisher;
    // IPublisher = MediatR events publish karne ke liye

    public ApproveLeaveCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IPublisher publisher)
    {
        _context = context;
        _currentUser = currentUser;
        _publisher = publisher;
    }

    public async Task<Result> Handle(
        ApproveLeaveCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        // Find leave request
        var leaveRequest = await _context.LeaveRequests
            .IgnoreQueryFilters()
            .Include(lr => lr.Employee)
            .Include(lr => lr.LeaveType)
            .FirstOrDefaultAsync(lr =>
                lr.Id == command.LeaveRequestId &&
                lr.CompanyId == companyId,
                cancellationToken);

        if (leaveRequest == null)
            throw new NotFoundException(
                "LeaveRequest", command.LeaveRequestId);

        if (leaveRequest.Status != LeaveStatus.Pending)
            return Result.Failure(
                $"Cannot approve a leave that is " +
                $"already {leaveRequest.Status}.");

        // Update leave request
        leaveRequest.Status = LeaveStatus.Approved;
        leaveRequest.ApprovedById = command.ApproverEmployeeId;
        leaveRequest.ApprovedAt = DateTime.UtcNow;

        // Deduct from leave balance
        var balance = await _context.LeaveBalances
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(lb =>
                lb.EmployeeId == leaveRequest.EmployeeId &&
                lb.LeaveTypeId == leaveRequest.LeaveTypeId &&
                lb.Year == leaveRequest.StartDate.Year,
                cancellationToken);

        if (balance != null)
            balance.UsedDays += leaveRequest.TotalDays;

        await _context.SaveChangesAsync(cancellationToken);

        // Fire MediatR event — other modules can react
        // Project module will listen and notify PM
        await _publisher.Publish(
            new LeaveApprovedEvent(
                leaveRequest.Id,
                leaveRequest.EmployeeId,
                companyId,
                leaveRequest.Employee.FullName,
                leaveRequest.StartDate,
                leaveRequest.EndDate,
                leaveRequest.TotalDays
            ), cancellationToken);

        return Result.Success();
    }
}

// ── Reject Leave ──────────────────────────────────────
public record RejectLeaveCommand(
    Guid LeaveRequestId,
    Guid ApproverEmployeeId,
    string RejectionReason
) : IRequest<Result>;

public class RejectLeaveCommandHandler
    : IRequestHandler<RejectLeaveCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IPublisher _publisher;

    public RejectLeaveCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IPublisher publisher)
    {
        _context = context;
        _currentUser = currentUser;
        _publisher = publisher;
    }

    public async Task<Result> Handle(
        RejectLeaveCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        var leaveRequest = await _context.LeaveRequests
            .IgnoreQueryFilters()
            .Include(lr => lr.Employee)
            .FirstOrDefaultAsync(lr =>
                lr.Id == command.LeaveRequestId &&
                lr.CompanyId == companyId,
                cancellationToken);

        if (leaveRequest == null)
            throw new NotFoundException(
                "LeaveRequest", command.LeaveRequestId);

        if (leaveRequest.Status != LeaveStatus.Pending)
            return Result.Failure(
                $"Cannot reject a leave that is " +
                $"already {leaveRequest.Status}.");

        leaveRequest.Status = LeaveStatus.Rejected;
        leaveRequest.ApprovedById = command.ApproverEmployeeId;
        leaveRequest.ApprovedAt = DateTime.UtcNow;
        leaveRequest.RejectionReason = command.RejectionReason;

        await _context.SaveChangesAsync(cancellationToken);

        // Fire rejected event
        await _publisher.Publish(
            new LeaveRejectedEvent(
                leaveRequest.Id,
                leaveRequest.EmployeeId,
                companyId,
                leaveRequest.Employee.FullName,
                command.RejectionReason
            ), cancellationToken);

        return Result.Success();
    }
}