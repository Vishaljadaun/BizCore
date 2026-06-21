namespace BizCore.Application.HR.Attendance;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Clock In ──────────────────────────────────────────
public record ClockInCommand(Guid? EmployeeId = null)
    : IRequest<Result<AttendanceResponse>>;
// EmployeeId nullable —
// If null, current logged-in user's own employee ID is used
// If provided, manager/admin is clocking in someone else

public class ClockInCommandHandler
    : IRequestHandler<ClockInCommand, Result<AttendanceResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ClockInCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<AttendanceResponse>> Handle(
        ClockInCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        // ── Determine which employee is clocking in ────────
        Guid employeeId;

        if (command.EmployeeId.HasValue &&
            command.EmployeeId.Value != Guid.Empty)
        {
            // Manager/Admin clocking in on behalf of someone
            employeeId = command.EmployeeId.Value;
        }
        else
        {
            // Employee clocking in themselves
            // Read employee_id from JWT claim
            if (!_currentUser.EmployeeId.HasValue)
                return Result<AttendanceResponse>.Failure(
                    "No employee profile linked to your account. " +
                    "Please contact HR to link your profile.");

            employeeId = _currentUser.EmployeeId.Value;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Check already clocked in today
        var existing = await _context.Attendances
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(a =>
                a.EmployeeId == employeeId &&
                a.Date == today,
                cancellationToken);

        if (existing != null)
            return Result<AttendanceResponse>.Failure(
                "Already clocked in for today.");

        // Verify employee exists and belongs to this company
        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e =>
                e.Id == employeeId &&
                e.CompanyId == companyId,
                cancellationToken);

        if (employee == null)
            throw new NotFoundException(
                "Employee", employeeId);

        // Determine if late (after 9:30 AM)
        var now = DateTime.UtcNow;
        var status = now.Hour > 9 ||
                     (now.Hour == 9 && now.Minute > 30)
            ? AttendanceStatus.Late
            : AttendanceStatus.Present;

        var attendance = new Domain.Entities.HR.Attendance
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            EmployeeId = employeeId,
            Date = today,
            ClockIn = now,
            Status = status,
        };

        await _context.Attendances
            .AddAsync(attendance, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<AttendanceResponse>.Success(
            new AttendanceResponse(
                attendance.Id,
                employee.Id,
                employee.FullName,
                attendance.Date,
                attendance.ClockIn,
                attendance.ClockOut,
                attendance.WorkingHours,
                attendance.Status.ToString(),
                attendance.Notes
            ));
    }
}

// ── Clock Out ─────────────────────────────────────────
public record ClockOutCommand(Guid? EmployeeId = null)
    : IRequest<Result<AttendanceResponse>>;

public class ClockOutCommandHandler
    : IRequestHandler<ClockOutCommand, Result<AttendanceResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ClockOutCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<AttendanceResponse>> Handle(
        ClockOutCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        // ── Determine which employee is clocking out ───────
        Guid employeeId;

        if (command.EmployeeId.HasValue &&
            command.EmployeeId.Value != Guid.Empty)
        {
            employeeId = command.EmployeeId.Value;
        }
        else
        {
            if (!_currentUser.EmployeeId.HasValue)
                return Result<AttendanceResponse>.Failure(
                    "No employee profile linked to your account. " +
                    "Please contact HR to link your profile.");

            employeeId = _currentUser.EmployeeId.Value;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var attendance = await _context.Attendances
            .IgnoreQueryFilters()
            .Include(a => a.Employee)
            .FirstOrDefaultAsync(a =>
                a.EmployeeId == employeeId &&
                a.Date == today,
                cancellationToken);

        if (attendance == null)
            return Result<AttendanceResponse>.Failure(
                "No clock-in found for today. " +
                "Please clock in first.");

        if (attendance.ClockOut.HasValue)
            return Result<AttendanceResponse>.Failure(
                "Already clocked out for today.");

        var now = DateTime.UtcNow;
        attendance.ClockOut = now;

        // Calculate working hours
        var duration = now - attendance.ClockIn;
        attendance.WorkingHours =
            Math.Round((decimal)duration.TotalHours, 2);

        // Update status based on hours worked
        if (attendance.WorkingHours < 4)
            attendance.Status = AttendanceStatus.HalfDay;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<AttendanceResponse>.Success(
            new AttendanceResponse(
                attendance.Id,
                attendance.Employee.Id,
                attendance.Employee.FullName,
                attendance.Date,
                attendance.ClockIn,
                attendance.ClockOut,
                attendance.WorkingHours,
                attendance.Status.ToString(),
                attendance.Notes
            ));
    }
}

// ── Get Attendance ────────────────────────────────────
public record GetAttendanceQuery(
    Guid? EmployeeId = null,
    DateOnly? Date = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<AttendanceResponse>>>;

public class GetAttendanceQueryHandler
    : IRequestHandler<GetAttendanceQuery,
        Result<PaginatedResponse<AttendanceResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetAttendanceQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PaginatedResponse<AttendanceResponse>>>
        Handle(
            GetAttendanceQuery query,
            CancellationToken cancellationToken)
    {
        var attQuery = _context.Attendances
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(a => a.Employee)
            .Where(a => a.CompanyId == _currentUser.CompanyId);

        if (query.EmployeeId.HasValue)
            attQuery = attQuery.Where(a =>
                a.EmployeeId == query.EmployeeId.Value);

        if (query.Date.HasValue)
            attQuery = attQuery.Where(a =>
                a.Date == query.Date.Value);

        var totalCount = await attQuery
            .CountAsync(cancellationToken);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        var items = await attQuery
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.ClockIn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new AttendanceResponse(
                a.Id,
                a.EmployeeId,
                a.Employee.FirstName + " " + a.Employee.LastName,
                a.Date,
                a.ClockIn,
                a.ClockOut,
                a.WorkingHours,
                a.Status.ToString(),
                a.Notes
            ))
            .ToListAsync(cancellationToken);

        return Result<PaginatedResponse<AttendanceResponse>>
            .Success(
                new PaginatedResponse<AttendanceResponse>(
                    items, totalCount, page, pageSize,
                    (int)Math.Ceiling(
                        (double)totalCount / pageSize)
                ));
    }
}