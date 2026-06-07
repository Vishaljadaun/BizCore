using BizCore.Application.Auth.DTOs;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Application.Auth.Commands;

public record LoginCommand(
    string Email,
    string Password
) : IRequest<Result<AuthResponse>>;


public class LoginCommandHandler
    : IRequestHandler<LoginCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ITokenService _tokenService;

    public LoginCommandHandler(
        IApplicationDbContext context,
        ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<Result<AuthResponse>> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        // ── Step 1: Find user by email ─────────────────────
        // IgnoreQueryFilters() because we don't have a tenant
        // context yet — we're trying to establish it!
        var user = await _context.Users
            .IgnoreQueryFilters()
            .Include(u => u.Company) // Load company in same query
            .FirstOrDefaultAsync(
                u => u.Email == request.Email.ToLower().Trim(),
                cancellationToken);

        // ── Step 2: Validate user exists ──────────────────
        if (user == null)
            // IMPORTANT: Don't say "email not found"
            // That tells attackers which emails are registered
            // Always say "invalid credentials" for security
            return Result<AuthResponse>.Failure(
                "Invalid email or password.", 401);

        // ── Step 3: Validate password ─────────────────────
        // BCrypt.Verify compares plain password against stored hash
        // Timing-attack safe (always takes same time)
        var passwordValid = BCrypt.Net.BCrypt
            .Verify(request.Password, user.PasswordHash);

        if (!passwordValid)
            return Result<AuthResponse>.Failure(
                "Invalid email or password.", 401);

        // ── Step 4: Check account status ──────────────────
        if (!user.IsActive)
            return Result<AuthResponse>.Failure(
                "Your account has been deactivated. " +
                "Contact your administrator.", 403);

        if (!user.Company.IsActive)
            return Result<AuthResponse>.Failure(
                "Your company account is inactive. " +
                "Contact BizCore support.", 403);

        // ── Step 5: Revoke old refresh tokens ─────────────
        // Why? Security — if user logs in on new device,
        // old tokens from that device still work otherwise
        // We revoke all and issue fresh ones
        var oldTokens = await _context.RefreshTokens
            .Where(r => r.UserId == user.Id
                && !r.IsRevoked
                && r.ExpiresAt > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        foreach (var token in oldTokens)
            token.IsRevoked = true;
        // Note: for multi-device support, you'd keep tokens
        // per device instead. We'll keep it simple for now.

        // ── Step 6: Generate new tokens ───────────────────
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshTokenValue = _tokenService.GenerateRefreshToken();

        var refreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            IsUsed = false
        };

        // ── Step 7: Update last login timestamp ───────────
        user.LastLogin = DateTime.UtcNow;

        await _context.RefreshTokens.AddAsync(refreshToken, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse(
            AccessToken: accessToken,
            RefreshToken: refreshTokenValue,
            AccessTokenExpiry: DateTime.UtcNow.AddMinutes(15),
            User: new UserDto(
                Id: user.Id,
                FirstName: user.FirstName,
                LastName: user.LastName,
                Email: user.Email,
                Role: user.Role.ToString(),
                CompanyId: user.CompanyId,
                CompanyName: user.Company.Name
            )
        );

        return Result<AuthResponse>.Success(response);
    }
}

// Validator
public class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}