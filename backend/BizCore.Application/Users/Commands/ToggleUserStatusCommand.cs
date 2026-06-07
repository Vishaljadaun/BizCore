namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record ToggleUserStatusCommand(Guid UserId)
    : IRequest<Result<bool>>;
// Returns new IsActive value so frontend can update UI

public class ToggleUserStatusCommandHandler
    : IRequestHandler<ToggleUserStatusCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ToggleUserStatusCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<bool>> Handle(
        ToggleUserStatusCommand command,
        CancellationToken cancellationToken)
    {
        // IgnoreQueryFilters because we need to find
        // inactive users too (to reactivate them)
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                u => u.Id == command.UserId &&
                     u.CompanyId == _currentUser.CompanyId,
                cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), command.UserId);

        // Cannot deactivate yourself
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot deactivate your own account.");

        // Toggle: true → false, false → true
        user.IsActive = !user.IsActive;

        // If deactivating, revoke all their refresh tokens
        // They'll be forced to login again when reactivated
        if (!user.IsActive)
        {
            var tokens = _context.RefreshTokens
                .Where(r => r.UserId == user.Id &&
                            !r.IsRevoked);

            foreach (var token in tokens)
                token.IsRevoked = true;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(user.IsActive);
    }
}