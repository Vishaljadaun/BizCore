namespace BizCore.Application.HR.Employees;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Link Employee To User ─────────────────────────────
public record LinkEmployeeToUserCommand(
    Guid EmployeeId,
    Guid UserId
) : IRequest<Result>;

public class LinkEmployeeToUserCommandHandler
    : IRequestHandler<LinkEmployeeToUserCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public LinkEmployeeToUserCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(
        LinkEmployeeToUserCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e =>
                e.Id == command.EmployeeId &&
                e.CompanyId == companyId,
                cancellationToken);

        if (employee == null)
            throw new NotFoundException(
                "Employee", command.EmployeeId);

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u =>
                u.Id == command.UserId &&
                u.CompanyId == companyId,
                cancellationToken);

        if (user == null)
            throw new NotFoundException(
                "User", command.UserId);

        if (employee.UserId.HasValue)
            throw new ConflictException(
                "Employee is already linked to a user.");

        if (user.EmployeeId.HasValue)
            throw new ConflictException(
                "User is already linked to an employee.");

        employee.UserId = command.UserId;
        user.EmployeeId = command.EmployeeId;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// ── Unlink Employee From User ─────────────────────────
public record UnlinkEmployeeFromUserCommand(Guid EmployeeId)
    : IRequest<Result>;

public class UnlinkEmployeeFromUserCommandHandler
    : IRequestHandler<UnlinkEmployeeFromUserCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UnlinkEmployeeFromUserCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(
        UnlinkEmployeeFromUserCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(e =>
                e.Id == command.EmployeeId &&
                e.CompanyId == companyId,
                cancellationToken);

        if (employee == null)
            throw new NotFoundException(
                "Employee", command.EmployeeId);

        if (!employee.UserId.HasValue)
            return Result.Failure(
                "This employee has no login access to revoke.");

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u =>
                u.Id == employee.UserId.Value,
                cancellationToken);

        if (user != null)
            user.EmployeeId = null;

        employee.UserId = null;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

// ── Get My Employee Profile (current user) ────────────
public record GetMyEmployeeProfileQuery()
    : IRequest<Result<DTOs.EmployeeResponse>>;

public class GetMyEmployeeProfileQueryHandler
    : IRequestHandler<GetMyEmployeeProfileQuery,
        Result<DTOs.EmployeeResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetMyEmployeeProfileQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DTOs.EmployeeResponse>> Handle(
        GetMyEmployeeProfileQuery query,
        CancellationToken cancellationToken)
    {
        if (!_currentUser.EmployeeId.HasValue)
            return Result<DTOs.EmployeeResponse>.Failure(
                "No employee profile linked to your account.",
                404);

        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e =>
                e.Id == _currentUser.EmployeeId.Value,
                cancellationToken);

        if (employee == null)
            return Result<DTOs.EmployeeResponse>.Failure(
                "Employee profile not found.", 404);

        return Result<DTOs.EmployeeResponse>.Success(
            new DTOs.EmployeeResponse(
                employee.Id,
                employee.EmployeeCode,
                employee.FirstName,
                employee.LastName,
                employee.FullName,
                employee.Email,
                employee.Phone,
                employee.Designation,
                employee.DepartmentId,
                employee.Department.Name,
                employee.JoiningDate,
                employee.Salary,
                employee.IsActive,
                employee.UserId,
                employee.CreatedAt
            ));
    }
}