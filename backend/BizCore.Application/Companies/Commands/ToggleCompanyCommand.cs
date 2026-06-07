namespace BizCore.Application.Companies.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record ToggleCompanyCommand(Guid CompanyId)
    : IRequest<Result<bool>>;

public class ToggleCompanyCommandHandler
    : IRequestHandler<ToggleCompanyCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;

    public ToggleCompanyCommandHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<bool>> Handle(
        ToggleCompanyCommand command,
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

        // Cannot deactivate BizCore System company
        // That would lock out SuperAdmin!
        if (company.Slug == "bizcore-system")
            throw new ForbiddenAccessException(
                "Cannot deactivate the system company.");

        company.IsActive = !company.IsActive;

        // If deactivating company:
        // Revoke all users' refresh tokens
        // They will be logged out automatically
        if (!company.IsActive)
        {
            var tokens = _context.RefreshTokens
                .IgnoreQueryFilters()
                .Where(r =>
                    !r.IsRevoked &&
                    _context.Users
                        .IgnoreQueryFilters()
                        .Any(u =>
                            u.Id == r.UserId &&
                            u.CompanyId == company.Id));

            foreach (var token in tokens)
                token.IsRevoked = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(company.IsActive);
    }
}