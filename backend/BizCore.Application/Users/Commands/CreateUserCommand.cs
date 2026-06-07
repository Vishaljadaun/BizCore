namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────────────────────────
// Record type — immutable, auto-generates Equals, GetHashCode, ToString
// IRequest<T> = MediatR interface, T = what this command returns
public record CreateUserCommand(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    UserRole Role
) : IRequest<Result<UserResponse>>;

// ── Handler ───────────────────────────────────────────────────────────────
// IRequestHandler<TRequest, TResponse>
// MediatR automatically finds this class and wires it to CreateUserCommand
// No manual registration needed — AddMediatR scans the assembly
public class CreateUserCommandHandler
    : IRequestHandler<CreateUserCommand, Result<UserResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    // Dependencies injected via constructor
    // ASP.NET DI container provides these automatically
    public CreateUserCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<UserResponse>> Handle(
        CreateUserCommand command,
        CancellationToken cancellationToken)
    {
        // ── Guard: Company context must exist ──────────────────────────
        // CompanyId comes from JWT token via ICurrentUserService
        // If null = request came without a valid token somehow
        var companyId = _currentUser.CompanyId;

        if (companyId == null)
            throw new ForbiddenAccessException(
                "Company context not found.");

        // ── Guard: Cannot create SuperAdmin ───────────────────────────
        // SuperAdmin is only created via DB seeder
        // No endpoint should allow creating SuperAdmin
        // This is a critical security check
        if (command.Role == UserRole.SuperAdmin)
            throw new ForbiddenAccessException(
                "Cannot create SuperAdmin through this endpoint.");

        // ── Guard: CompanyAdmin cannot create another CompanyAdmin ─────
        // Only SuperAdmin can create CompanyAdmin users
        // A CompanyAdmin should not be able to elevate others
        var currentRole = _currentUser.UserRole;

        if (command.Role == UserRole.CompanyAdmin &&
            currentRole != UserRole.SuperAdmin.ToString())
        {
            throw new ForbiddenAccessException(
                "Only SuperAdmin can create CompanyAdmin users.");
        }

        // ── Check email uniqueness within this company ─────────────────
        // Same email CAN exist in different companies:
        // john@gmail.com in TechNova    ✅ Allowed
        // john@gmail.com in ClientCo    ✅ Allowed
        // john@gmail.com TWICE in TechNova ❌ Not allowed
        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            // IgnoreQueryFilters = bypass global tenant filter
            // We add our own explicit CompanyId filter below
            .AnyAsync(
                u => u.Email == command.Email.ToLower().Trim() &&
                     u.CompanyId == companyId.Value,
                cancellationToken);

        if (emailExists)
            throw new ConflictException(
                "A user with this email already exists " +
                "in your company.");

        // ── Create User entity ────────────────────────────────────────
        var user = new User
        {
            Id = Guid.NewGuid(),

            CompanyId = companyId.Value,
            // Explicitly assign current company
            // User ALWAYS belongs to the caller's company
            // Frontend cannot override this — it comes from JWT

            FirstName = command.FirstName.Trim(),
            LastName = command.LastName.Trim(),
            Email = command.Email.ToLower().Trim(),
            // Always store email in lowercase
            // Prevents duplicate: "John@gmail.com" vs "john@gmail.com"

            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                command.Password, workFactor: 12),
            // workFactor: 12 = 2^12 = 4096 hashing rounds
            // Strong enough to resist brute force
            // ~300ms per hash — acceptable for login
            // Never store plain text password

            Role = command.Role,
            IsActive = true,
            // New users are active by default
        };

        // ── Save to database ──────────────────────────────────────────
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);
        // SaveChangesAsync also auto-sets CreatedAt
        // via our DbContext override

        // ── Return response ───────────────────────────────────────────
        // Never return PasswordHash in response
        // UserResponse DTO deliberately excludes it
        return Result<UserResponse>.Success(
            new UserResponse(
                Id: user.Id,
                FirstName: user.FirstName,
                LastName: user.LastName,
                FullName: user.FullName,
                Email: user.Email,
                Role: user.Role.ToString(),
                IsActive: user.IsActive,
                CompanyId: user.CompanyId,
                CreatedAt: user.CreatedAt,
                LastLogin: user.LastLogin,
                UpdatedAt: user.UpdatedAt
            ), statusCode: 201);
        // 201 Created = resource was successfully created
        // Controller uses this status code in the response
    }
}

// ── Validator ─────────────────────────────────────────────────────────────
// MediatR ValidationBehavior runs this BEFORE the handler
// If any rule fails → handler is never called
// → ValidationException is thrown
// → GlobalExceptionMiddleware catches it → 400 Bad Request
public class CreateUserCommandValidator
    : AbstractValidator<CreateUserCommand>
{
    public CreateUserCommandValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty()
            .WithMessage("First name is required.")
            .MaximumLength(100)
            .WithMessage("First name cannot exceed 100 characters.");

        RuleFor(x => x.LastName)
            .NotEmpty()
            .WithMessage("Last name is required.")
            .MaximumLength(100)
            .WithMessage("Last name cannot exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty()
            .WithMessage("Email is required.")
            .EmailAddress()
            .WithMessage("Please enter a valid email address.")
            .MaximumLength(255)
            .WithMessage("Email cannot exceed 255 characters.");

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required.")
            .MinimumLength(8)
            .WithMessage("Password must be at least 8 characters.")
            .MaximumLength(100)
            .WithMessage("Password cannot exceed 100 characters.")
            .Matches(@"[A-Z]")
            .WithMessage("Password must contain at least one uppercase letter.")
            .Matches(@"[a-z]")
            .WithMessage("Password must contain at least one lowercase letter.")
            .Matches(@"[0-9]")
            .WithMessage("Password must contain at least one number.")
            .Matches(@"[^a-zA-Z0-9]")
            .WithMessage("Password must contain at least one special character.");

        RuleFor(x => x.Role)
            .IsInEnum()
            .WithMessage("Please select a valid role.")
            .Must(role => role != UserRole.SuperAdmin)
            .WithMessage("SuperAdmin role cannot be assigned through this endpoint.");
        // Double validation:
        // IsInEnum = must be a valid UserRole value
        // Must = cannot be SuperAdmin specifically
        // Even if someone sends role = 1 (SuperAdmin enum value)
        // This validator catches it before handler runs
    }
}