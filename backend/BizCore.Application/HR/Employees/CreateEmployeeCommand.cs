namespace BizCore.Application.HR.Employees;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Entities.HR;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record CreateEmployeeCommand(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string Designation,
    Guid DepartmentId,
    DateOnly JoiningDate,
    decimal Salary,
    Guid? UserId
) : IRequest<Result<EmployeeResponse>>;

// ── Handler ───────────────────────────────────────────
public class CreateEmployeeCommandHandler
    : IRequestHandler<CreateEmployeeCommand,
        Result<EmployeeResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateEmployeeCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<EmployeeResponse>> Handle(
        CreateEmployeeCommand command,
        CancellationToken cancellationToken)
    {
        var companyId = _currentUser.CompanyId
            ?? throw new ForbiddenAccessException(
                "Company context not found.");

        // ── Option 1: userId provided → link existing user ──
        if (command.UserId.HasValue)
        {
            // Verify user belongs to same company
            var user = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u =>
                    u.Id == command.UserId.Value &&
                    u.CompanyId == companyId,
                    cancellationToken);

            if (user == null)
                throw new NotFoundException(
                    "User", command.UserId.Value);

            // Check user not already linked to another employee
            var alreadyLinked = await _context.Employees
                .IgnoreQueryFilters()
                .AnyAsync(e =>
                    e.UserId == command.UserId.Value &&
                    e.CompanyId == companyId,
                    cancellationToken);

            if (alreadyLinked)
                throw new ConflictException(
                    "This user is already linked to an employee profile.");
        }


        // Check email unique in company
        var emailExists = await _context.Employees
            .IgnoreQueryFilters()
            .AnyAsync(e =>
                e.CompanyId == companyId &&
                e.Email == command.Email.ToLower().Trim(),
                cancellationToken);

        if (emailExists)
            throw new ConflictException(
                "Employee with this email already exists.");

        // Verify department belongs to company
        var department = await _context.Departments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(d =>
                d.Id == command.DepartmentId &&
                d.CompanyId == companyId,
                cancellationToken);

        if (department == null)
            throw new NotFoundException(
                "Department", command.DepartmentId);

        // Auto generate employee code: EMP001, EMP002
        var count = await _context.Employees
            .IgnoreQueryFilters()
            .CountAsync(e => e.CompanyId == companyId,
                cancellationToken);

        var employeeCode = $"EMP{(count + 1):D3}";
        // D3 = pad with zeros: 1→001, 10→010, 100→100

        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            EmployeeCode = employeeCode,
            FirstName = command.FirstName.Trim(),
            LastName = command.LastName.Trim(),
            Email = command.Email.ToLower().Trim(),
            Phone = command.Phone?.Trim(),
            Designation = command.Designation.Trim(),
            DepartmentId = command.DepartmentId,
            JoiningDate = command.JoiningDate,
            Salary = command.Salary,
            UserId = command.UserId,
            IsActive = true,
        };

        await _context.Employees
            .AddAsync(employee, cancellationToken);

        // Auto create leave balances for current year
        var currentYear = DateTime.UtcNow.Year;
        var leaveTypes = await _context.LeaveTypes
            .IgnoreQueryFilters()
            .Where(lt =>
                lt.CompanyId == companyId &&
                lt.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var leaveType in leaveTypes)
        {
            await _context.LeaveBalances.AddAsync(
                new LeaveBalance
                {
                    Id = Guid.NewGuid(),
                    CompanyId = companyId,
                    EmployeeId = employee.Id,
                    LeaveTypeId = leaveType.Id,
                    Year = currentYear,
                    TotalDays = leaveType.DaysAllowed,
                    UsedDays = 0,
                }, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<EmployeeResponse>.Success(
            new EmployeeResponse(
                employee.Id,
                employee.EmployeeCode,
                employee.FirstName,
                employee.LastName,
                employee.FullName,
                employee.Email,
                employee.Phone,
                employee.Designation,
                department.Id,
                department.Name,
                employee.JoiningDate,
                employee.Salary,
                employee.IsActive,
                employee.UserId,
                employee.CreatedAt
            ), 201);
    }
}

// ── Validator ─────────────────────────────────────────
public class CreateEmployeeCommandValidator
    : AbstractValidator<CreateEmployeeCommand>
{
    public CreateEmployeeCommandValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email.");

        RuleFor(x => x.Designation)
            .NotEmpty().WithMessage("Designation is required.")
            .MaximumLength(100);

        RuleFor(x => x.DepartmentId)
            .NotEmpty().WithMessage("Department is required.");

        RuleFor(x => x.Salary)
            .GreaterThan(0)
            .WithMessage("Salary must be greater than 0.");

        RuleFor(x => x.JoiningDate)
            .NotEmpty().WithMessage("Joining date is required.");
    }
}