namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
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
        var user = await _context.Users
            .FirstOrDefaultAsync(
                u => u.Id == command.UserId,
                cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), command.UserId);

        // Cannot change own role
        // Prevents admin from accidentally locking themselves out
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot change your own role.");

        // Cannot assign SuperAdmin role
        if (command.NewRole == UserRole.SuperAdmin)
            throw new ForbiddenAccessException(
                "Cannot assign SuperAdmin role.");

        user.Role = command.NewRole;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}