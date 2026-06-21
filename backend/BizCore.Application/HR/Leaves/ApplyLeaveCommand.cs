namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using ValidationException = Common.Exceptions.ValidationException;

// ── Command ───────────────────────────────────────────
public record ApplyLeaveCommand(
    Guid EmployeeId,
    Guid LeaveTypeId,
    DateOnly StartDate,
    DateOnly EndDate,
    string Reason
) : IRequest<Result<LeaveRequestResponse>>;

// ── Handler ───────────────────────────────────────────
public class ApplyLeaveCommandHandler
    : IRequestHandler<ApplyLeaveCommand,
        Result<LeaveRequestResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ApplyLeaveCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<LeaveRequestResponse>> Handle(
        ApplyLeaveCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        // Validate dates
        if (command.EndDate < command.StartDate)
            throw new ValidationException(
                new[] {
                    new FluentValidation.Results
                        .ValidationFailure(
                        "EndDate",
                        "End date cannot be before start date.")
                });

        // Calculate working days
        var totalDays = CalculateWorkingDays(
            command.StartDate, command.EndDate);

        if (totalDays <= 0)
            throw new ValidationException(
                new[] {
                    new FluentValidation.Results
                        .ValidationFailure(
                        "Dates",
                        "Leave must be at least 1 working day.")
                });

        // Check employee exists
        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e =>
                e.Id == command.EmployeeId &&
                e.CompanyId == companyId,
                cancellationToken);

        if (employee == null)
            throw new NotFoundException(
                "Employee", command.EmployeeId);

        // Check leave type exists
        var leaveType = await _context.LeaveTypes
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(lt =>
                lt.Id == command.LeaveTypeId &&
                lt.CompanyId == companyId &&
                lt.IsActive,
                cancellationToken);

        if (leaveType == null)
            throw new NotFoundException(
                "LeaveType", command.LeaveTypeId);

        // Check leave balance
        var balance = await _context.LeaveBalances
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(lb =>
                lb.EmployeeId == command.EmployeeId &&
                lb.LeaveTypeId == command.LeaveTypeId &&
                lb.Year == command.StartDate.Year,
                cancellationToken);

        if (balance == null)
            return Result<LeaveRequestResponse>.Failure(
                "No leave balance found for this year.");

        var remainingDays = balance.TotalDays - balance.UsedDays;
        if (remainingDays < totalDays)
            return Result<LeaveRequestResponse>.Failure(
                $"Insufficient leave balance. " +
                $"Available: {remainingDays} days, " +
                $"Requested: {totalDays} days.");

        // Check no overlapping leave request
        var overlapping = await _context.LeaveRequests
            .IgnoreQueryFilters()
            .AnyAsync(lr =>
                lr.EmployeeId == command.EmployeeId &&
                lr.Status != LeaveStatus.Rejected &&
                lr.Status != LeaveStatus.Cancelled &&
                lr.StartDate <= command.EndDate &&
                lr.EndDate >= command.StartDate,
                cancellationToken);

        if (overlapping)
            return Result<LeaveRequestResponse>.Failure(
                "You already have a leave request " +
                "for overlapping dates.");

        // Create leave request
        var leaveRequest = new LeaveRequest
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            EmployeeId = command.EmployeeId,
            LeaveTypeId = command.LeaveTypeId,
            StartDate = command.StartDate,
            EndDate = command.EndDate,
            TotalDays = totalDays,
            Reason = command.Reason.Trim(),
            Status = LeaveStatus.Pending,
        };

        await _context.LeaveRequests
            .AddAsync(leaveRequest, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<LeaveRequestResponse>.Success(
            new LeaveRequestResponse(
                leaveRequest.Id,
                employee.Id,
                employee.FullName,
                leaveType.Name,
                leaveRequest.StartDate,
                leaveRequest.EndDate,
                leaveRequest.TotalDays,
                leaveRequest.Reason,
                leaveRequest.Status.ToString(),
                null, null, null,
                leaveRequest.CreatedAt
            ), 201);
    }

    // Calculate working days (exclude weekends)
    private static int CalculateWorkingDays(
        DateOnly start, DateOnly end)
    {
        int days = 0;
        var current = start;
        while (current <= end)
        {
            if (current.DayOfWeek != DayOfWeek.Saturday &&
                current.DayOfWeek != DayOfWeek.Sunday)
                days++;
            current = current.AddDays(1);
        }
        return days;
    }
}

// ── Validator ─────────────────────────────────────────
public class ApplyLeaveCommandValidator
    : AbstractValidator<ApplyLeaveCommand>
{
    public ApplyLeaveCommandValidator()
    {
        RuleFor(x => x.EmployeeId)
            .NotEmpty().WithMessage("Employee is required.");

        RuleFor(x => x.LeaveTypeId)
            .NotEmpty().WithMessage("Leave type is required.");

        RuleFor(x => x.StartDate)
            .NotEmpty().WithMessage("Start date is required.");

        RuleFor(x => x.EndDate)
            .NotEmpty().WithMessage("End date is required.");

        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("Reason is required.")
            .MaximumLength(500).WithMessage("Max 500 characters.");
    }
}