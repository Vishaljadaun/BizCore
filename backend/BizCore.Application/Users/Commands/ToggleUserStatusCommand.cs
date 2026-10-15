using BizCore.Application.Security;
using BizCore.Domain.Enums;
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
        return await AccountAccess.Mutate(_context, _currentUser, command.UserId, async (caller, user) => {


        // Cannot deactivate yourself
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot deactivate your own account.");

        // Toggle: true → false, false → true
        if (user.IsActive) await AccountAccess.ProtectLastAdmin(_context, user, cancellationToken);
        user.IsActive = !user.IsActive;

        // If deactivating, revoke all their refresh tokens
        // They'll be forced to login again when reactivated
        if (!user.IsActive)
        {
            await AccountAccess.RevokeSessions(_context, user, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(user.IsActive);
        }, cancellationToken);
    }
}