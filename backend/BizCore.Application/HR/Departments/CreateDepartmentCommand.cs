namespace BizCore.Application.HR.Departments;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Entities.HR;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record CreateDepartmentCommand(
    string Name,
    string? Description
) : IRequest<Result<DepartmentResponse>>;

// ── Handler ───────────────────────────────────────────
public class CreateDepartmentCommandHandler
    : IRequestHandler<CreateDepartmentCommand,
        Result<DepartmentResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public CreateDepartmentCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DepartmentResponse>> Handle(
        CreateDepartmentCommand command,
        CancellationToken cancellationToken)
    {
        if (_currentUser.CompanyId == null)
            throw new ForbiddenAccessException(
                "Company context not found.");

        // Check duplicate name in same company
        var exists = await _context.Departments
            .IgnoreQueryFilters()
            .AnyAsync(d =>
                d.CompanyId == _currentUser.CompanyId &&
                d.Name.ToLower() == command.Name.ToLower().Trim(),
                cancellationToken);

        if (exists)
            throw new ConflictException(
                "Department with this name already exists.");

        var department = new Department
        {
            Id = Guid.NewGuid(),
            CompanyId = _currentUser.CompanyId.Value,
            Name = command.Name.Trim(),
            Description = command.Description?.Trim(),
            IsActive = true,
        };

        await _context.Departments
            .AddAsync(department, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<DepartmentResponse>.Success(
            new DepartmentResponse(
                department.Id,
                department.Name,
                department.Description,
                null, null, 0,
                department.IsActive,
                department.CreatedAt
            ), 201);
    }
}

// ── Validator ─────────────────────────────────────────
public class CreateDepartmentCommandValidator
    : AbstractValidator<CreateDepartmentCommand>
{
    public CreateDepartmentCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Department name is required.")
            .MaximumLength(100).WithMessage("Max 100 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500)
            .WithMessage("Max 500 characters.")
            .When(x => x.Description != null);
    }
}