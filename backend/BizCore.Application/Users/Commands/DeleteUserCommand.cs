namespace BizCore.Application.Users.Commands;

using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record DeleteUserCommand(Guid UserId)
    : IRequest<Result>;

public class DeleteUserCommandHandler
    : IRequestHandler<DeleteUserCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public DeleteUserCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(
        DeleteUserCommand command,
        CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(
                u => u.Id == command.UserId,
                cancellationToken);

        if (user == null)
            throw new NotFoundException(nameof(User), command.UserId);

        // Cannot delete yourself
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot delete your own account.");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}