using BizCore.Application.Security;
using BizCore.Domain.Enums;
namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record ChangeRoleCommand(
    Guid UserId,
    UserRole NewRole
) : IRequest<Result>;

public class ChangeRoleCommandHandler
    : IRequestHandler<ChangeRoleCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public ChangeRoleCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(
        ChangeRoleCommand command,
        CancellationToken cancellationToken)
    {
        return await AccountAccess.Mutate(_context, _currentUser, command.UserId, async (caller, user) => {


        // Cannot change own role
        // Prevents admin from accidentally locking themselves out
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot change your own role.");

        // Cannot assign SuperAdmin role
        if (command.NewRole == UserRole.SuperAdmin)
            throw new ForbiddenAccessException(
                "Cannot assign SuperAdmin role.");

        if (!Enum.IsDefined(command.NewRole)) throw new ValidationException("role", "Choose a valid role.");
        if (command.NewRole == UserRole.CompanyAdmin && caller.Role != UserRole.SuperAdmin)
            throw new ForbiddenAccessException("Only a platform administrator can assign CompanyAdmin.");
        if (command.NewRole != user.Role) await AccountAccess.ProtectLastAdmin(_context, user, cancellationToken);
        user.Role = command.NewRole;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
        }, cancellationToken);
    }
}