namespace BizCore.Application.Companies.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Companies.DTOs;
using BizCore.Domain.Entities;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record UpdateCompanyCommand(
    Guid CompanyId,
    string Name,
    string Subscription
) : IRequest<Result<CompanyResponse>>;

public class UpdateCompanyCommandHandler
    : IRequestHandler<UpdateCompanyCommand,
        Result<CompanyResponse>>
{
    private readonly IApplicationDbContext _context;

    public UpdateCompanyCommandHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CompanyResponse>> Handle(
        UpdateCompanyCommand command,
        CancellationToken cancellationToken)
    {
        var company = await _context.Companies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                c => c.Id == command.CompanyId,
                cancellationToken);

        if (company == null)
            throw new NotFoundException(
                nameof(Company), command.CompanyId);

        company.Name = command.Name.Trim();
        company.Subscription = command.Subscription;

        await _context.SaveChangesAsync(cancellationToken);

        var totalUsers = _context.Users
            .IgnoreQueryFilters()
            .Count(u => u.CompanyId == company.Id);

        var activeUsers = _context.Users
            .IgnoreQueryFilters()
            .Count(u => u.CompanyId == company.Id
                && u.IsActive);

        return Result<CompanyResponse>.Success(
            new CompanyResponse(
                company.Id,
                company.Name,
                company.Slug,
                company.LogoUrl,
                company.Subscription,
                company.IsActive,
                totalUsers,
                activeUsers,
                company.CreatedAt,
                company.UpdatedAt
            ));
    }
}

public class UpdateCompanyCommandValidator
    : AbstractValidator<UpdateCompanyCommand>
{
    public UpdateCompanyCommandValidator()
    {
        RuleFor(x => x.CompanyId)
            .NotEmpty().WithMessage("Company ID is required.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Company name is required.")
            .MaximumLength(200).WithMessage("Max 200 characters.");

        RuleFor(x => x.Subscription)
            .NotEmpty().WithMessage("Subscription is required.")
            .Must(s => new[] {
                "trial", "pro", "enterprise"
            }.Contains(s.ToLower()))
            .WithMessage("Invalid subscription type.");
    }
}