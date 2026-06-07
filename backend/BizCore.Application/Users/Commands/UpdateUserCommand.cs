namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record UpdateUserCommand(
    Guid UserId,
    string FirstName,
    string LastName,
    string Email
) : IRequest<Result<UserResponse>>;

// ── Handler ───────────────────────────────────────────
public class UpdateUserCommandHandler
    : IRequestHandler<UpdateUserCommand, Result<UserResponse>>
{
    private readonly IApplicationDbContext _context;

    public UpdateUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<UserResponse>> Handle(
        UpdateUserCommand command,
        CancellationToken cancellationToken)
    {
        // Find user — global filter ensures same company
        var user = await _context.Users
            .FirstOrDefaultAsync(
                u => u.Id == command.UserId,
                cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), command.UserId);

        // Check email uniqueness if email changed
        if (user.Email != command.Email.ToLower().Trim())
        {
            var emailTaken = _context.Users.Any(u =>
                u.Email == command.Email.ToLower().Trim() &&
                u.Id != command.UserId);
            // Exclude current user from check

            if (emailTaken)
                throw new ConflictException(
                    "This email is already in use.");
        }

        // Update fields
        user.FirstName = command.FirstName.Trim();
        user.LastName = command.LastName.Trim();
        user.Email = command.Email.ToLower().Trim();
        // UpdatedAt is set automatically by DbContext.SaveChangesAsync

        await _context.SaveChangesAsync(cancellationToken);

        return Result<UserResponse>.Success(
            new UserResponse(
                user.Id,
                user.FirstName,
                user.LastName,
                user.FullName,
                user.Email,
                user.Role.ToString(),
                user.IsActive,
                user.CompanyId,
                user.CreatedAt,
                user.LastLogin,
                user.UpdatedAt
            ));
    }
}

// ── Validator ─────────────────────────────────────────
public class UpdateUserCommandValidator
    : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100).WithMessage("Max 100 characters.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100).WithMessage("Max 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");
    }
}