namespace BizCore.Application.Companies.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Companies.DTOs;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record CreateCompanyCommand(
    string Name,
    string AdminFirstName,
    string AdminLastName,
    string AdminEmail,
    string AdminPassword,
    string Subscription
) : IRequest<Result<CompanyResponse>>;

// ── Handler ───────────────────────────────────────────
public class CreateCompanyCommandHandler
    : IRequestHandler<CreateCompanyCommand,
        Result<CompanyResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ITokenService _tokenService;

    public CreateCompanyCommandHandler(
        IApplicationDbContext context,
        ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<Result<CompanyResponse>> Handle(
        CreateCompanyCommand command,
        CancellationToken cancellationToken)
    {
        // Check email not already registered
        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(
                u => u.Email == command.AdminEmail
                    .ToLower().Trim(),
                cancellationToken);

        if (emailExists)
            throw new ConflictException(
                "This email is already registered.");

        // Generate unique slug
        var slug = GenerateSlug(command.Name);
        var slugExists = await _context.Companies
            .IgnoreQueryFilters()
            .AnyAsync(
                c => c.Slug == slug,
                cancellationToken);

        if (slugExists)
            slug = $"{slug}-{Guid.NewGuid().ToString()[..6]}";

        // Create company
        var company = new Company
        {
            Id = Guid.NewGuid(),
            Name = command.Name.Trim(),
            Slug = slug,
            Subscription = command.Subscription,
            IsActive = true,
        };

        // Create CompanyAdmin user
        var admin = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = company.Id,
            FirstName = command.AdminFirstName.Trim(),
            LastName = command.AdminLastName.Trim(),
            Email = command.AdminEmail.ToLower().Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(
                command.AdminPassword, workFactor: 12),
            Role = UserRole.CompanyAdmin,
            IsActive = true,
        };

        await _context.Companies
            .AddAsync(company, cancellationToken);
        await _context.Users
            .AddAsync(admin, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<CompanyResponse>.Success(
            new CompanyResponse(
                company.Id,
                company.Name,
                company.Slug,
                company.LogoUrl,
                company.Subscription,
                company.IsActive,
                TotalUsers: 1,
                ActiveUsers: 1,
                company.CreatedAt,
                company.UpdatedAt
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
public class CreateCompanyCommandValidator
    : AbstractValidator<CreateCompanyCommand>
{
    public CreateCompanyCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Company name is required.")
            .MinimumLength(2).WithMessage("Min 2 characters.")
            .MaximumLength(200).WithMessage("Max 200 characters.");

        RuleFor(x => x.AdminFirstName)
            .NotEmpty().WithMessage("Admin first name is required.")
            .MaximumLength(100).WithMessage("Max 100 characters.");

        RuleFor(x => x.AdminLastName)
            .NotEmpty().WithMessage("Admin last name is required.")
            .MaximumLength(100).WithMessage("Max 100 characters.");

        RuleFor(x => x.AdminEmail)
            .NotEmpty().WithMessage("Admin email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.AdminPassword)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(8).WithMessage("Min 8 characters.")
            .Matches(@"[A-Z]").WithMessage("Need uppercase letter.")
            .Matches(@"[a-z]").WithMessage("Need lowercase letter.")
            .Matches(@"[0-9]").WithMessage("Need a number.")
            .Matches(@"[^a-zA-Z0-9]")
            .WithMessage("Need a special character.");

        RuleFor(x => x.Subscription)
            .NotEmpty().WithMessage("Subscription is required.")
            .Must(s => new[] {
                "trial", "pro", "enterprise"
            }.Contains(s.ToLower()))
            .WithMessage("Invalid subscription. Use: trial, pro, enterprise.");
    }
}