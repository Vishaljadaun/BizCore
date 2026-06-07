namespace BizCore.Application.Auth.Commands;

using BizCore.Application.Auth.DTOs;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record RegisterCompanyCommand(
    string CompanyName,
    string FirstName,
    string LastName,
    string Email,
    string Password
) : IRequest<Result<AuthResponse>>;

// ── Handler ───────────────────────────────────────────
public class RegisterCompanyCommandHandler
    : IRequestHandler<RegisterCompanyCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ITokenService _tokenService;

    public RegisterCompanyCommandHandler(
        IApplicationDbContext context,
        ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<Result<AuthResponse>> Handle(
        RegisterCompanyCommand request,
        CancellationToken cancellationToken)
    {
        // Email already registered?
        var emailExists = _context.Users
            .IgnoreQueryFilters()
            .Any(u => u.Email == request.Email.ToLower());

        if (emailExists)
            return Result<AuthResponse>.Failure(
                "Email already registered hai.");

        // Slug generate karo
        var slug = GenerateSlug(request.CompanyName);

        var slugExists = _context.Companies
            .Any(c => c.Slug == slug);

        if (slugExists)
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";

        // Company banao
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = request.CompanyName.Trim(),
            Slug = slug,
            Subscription = "trial",
            IsActive = true
        };

        // Admin user banao
        var user = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = request.Email.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                request.Password, workFactor: 12),
            Role = UserRole.CompanyAdmin,
            IsActive = true
        };

        // Tokens generate karo
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

        // Sab ek transaction mein save karo
        await _context.Companies.AddAsync(company, cancellationToken);
        await _context.Users.AddAsync(user, cancellationToken);
        await _context.RefreshTokens.AddAsync(
            refreshToken, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(
            new AuthResponse(
                AccessToken: accessToken,
                RefreshToken: refreshTokenValue,
                AccessTokenExpiry: DateTime.UtcNow.AddMinutes(15),
                User: new UserDto(
                    Id: user.Id,
                    FirstName: user.FirstName,
                    LastName: user.LastName,
                    Email: user.Email,
                    Role: user.Role.ToString(),
                    CompanyId: company.Id,
                    CompanyName: company.Name
                )
            ), 201);
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLower().Trim()
            .Replace(" ", "-")
            .Replace("&", "and");

        slug = new string(slug
            .Where(c => char.IsLetterOrDigit(c) || c == '-')
            .ToArray());

        while (slug.Contains("--"))
            slug = slug.Replace("--", "-");

        return slug.Trim('-');
    }
}

// ── Validator ─────────────────────────────────────────
public class RegisterCompanyCommandValidator
    : AbstractValidator<RegisterCompanyCommand>
{
    public RegisterCompanyCommandValidator()
    {
        RuleFor(x => x.CompanyName)
            .NotEmpty().WithMessage("Company name is required.")
            .MinimumLength(2).WithMessage("Company name too short.")
            .MaximumLength(200).WithMessage("Company name too long.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required.")
            .MaximumLength(100).WithMessage("First name too long.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required.")
            .MaximumLength(100).WithMessage("Last name too long.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.")
            .MaximumLength(255).WithMessage("Email too long.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Min 8 characters.")
            .MaximumLength(100).WithMessage("Password too long.")
            // Must have uppercase, lowercase, digit, special char
            .Matches(@"[A-Z]").WithMessage("Need an uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Need a lowercase letter.")
            .Matches(@"[0-9]").WithMessage("Need a number.")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("Need a special character.");
    }
}