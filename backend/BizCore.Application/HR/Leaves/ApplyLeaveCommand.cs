namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.Access;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record ApplyLeaveCommand(Guid EmployeeId, Guid LeaveTypeId, DateOnly StartDate,
    DateOnly EndDate, string Reason) : IRequest<Result<LeaveRequestResponse>>;

public class ApplyLeaveCommandHandler(IApplicationDbContext db, ICurrentUserService current)
    : IRequestHandler<ApplyLeaveCommand, Result<LeaveRequestResponse>>
{
    public async Task<Result<LeaveRequestResponse>> Handle(ApplyLeaveCommand command, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        var employee = await EmployeeAccess.RequireAsync(db, caller, command.EmployeeId, ct);
        // Applications are self-service, including for managers and administrators.
        if (caller.EmployeeId != employee.Id || employee.UserId != caller.Id)
            throw new ForbiddenAccessException("Apply using your own linked employee profile.");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (command.StartDate < today || command.EndDate < command.StartDate ||
            command.StartDate.Year != command.EndDate.Year || command.StartDate.Year > today.Year + 1)
            return Result<LeaveRequestResponse>.Failure("Choose future dates in the same calendar year (this year or next year).");
        if (string.IsNullOrWhiteSpace(command.Reason) || command.Reason.Trim().Length > 500)
            return Result<LeaveRequestResponse>.Failure("Enter a reason of 1–500 characters.");
        var days = WorkingDays(command.StartDate, command.EndDate);
        if (days == 0) return Result<LeaveRequestResponse>.Failure("Choose at least one weekday. Weekends do not use leave.");

        return await db.WithEmployeeLockAsync(employee.Id, async () =>
        {
            var type = await db.LeaveTypes.AsNoTracking().FirstOrDefaultAsync(x =>
                x.Id == command.LeaveTypeId && x.CompanyId == caller.CompanyId && x.IsActive, ct)
                ?? throw new NotFoundException("Leave type", command.LeaveTypeId);
            if (await db.LeaveRequests.AnyAsync(x => x.CompanyId == caller.CompanyId &&
                x.EmployeeId == employee.Id && (x.Status == LeaveStatus.Pending || x.Status == LeaveStatus.Approved) &&
                x.StartDate <= command.EndDate && x.EndDate >= command.StartDate, ct))
                return Result<LeaveRequestResponse>.Failure("An existing pending or approved request overlaps these dates.", 409);
            var balance = await db.LeaveBalances.FirstOrDefaultAsync(x => x.CompanyId == caller.CompanyId &&
                x.EmployeeId == employee.Id && x.LeaveTypeId == type.Id && x.Year == command.StartDate.Year, ct);
            var pending = await db.LeaveRequests.Where(x => x.CompanyId == caller.CompanyId &&
                x.EmployeeId == employee.Id && x.LeaveTypeId == type.Id && x.StartDate.Year == command.StartDate.Year &&
                x.Status == LeaveStatus.Pending).SumAsync(x => x.TotalDays, ct);
            var available = (balance?.TotalDays ?? type.DaysAllowed) - (balance?.UsedDays ?? 0) - pending;
            if (days > available)
                return Result<LeaveRequestResponse>.Failure($"Only {available} days are available after pending requests.", 409);
            if (balance == null)
                db.LeaveBalances.Add(new LeaveBalance { Id = Guid.NewGuid(), CompanyId = employee.CompanyId,
                    EmployeeId = employee.Id, LeaveTypeId = type.Id, Year = command.StartDate.Year, TotalDays = type.DaysAllowed });
            var request = new LeaveRequest { Id = Guid.NewGuid(), CompanyId = employee.CompanyId,
                EmployeeId = employee.Id, LeaveTypeId = type.Id, StartDate = command.StartDate,
                EndDate = command.EndDate, TotalDays = days, Reason = command.Reason.Trim() };
            db.LeaveRequests.Add(request);
            await db.SaveChangesAsync(ct);
            return Result<LeaveRequestResponse>.Success(new(request.Id, employee.Id, employee.FullName,
                type.Name, request.StartDate, request.EndDate, days, request.Reason, "Pending", null, null, null, request.CreatedAt), 201);
        }, ct);
    }

    public static int WorkingDays(DateOnly start, DateOnly end)
    {
        var days = 0;
        for (var day = start.DayNumber; day <= end.DayNumber; day++)
            if (DateOnly.FromDayNumber(day).DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) days++;
        return days;
    }
}

public class ApplyLeaveCommandValidator : AbstractValidator<ApplyLeaveCommand>
{
    public ApplyLeaveCommandValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
        RuleFor(x => x.LeaveTypeId).NotEmpty();
        RuleFor(x => x.StartDate).NotEmpty();
        RuleFor(x => x.EndDate).NotEmpty();
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}
