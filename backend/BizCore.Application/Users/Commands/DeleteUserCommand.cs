using BizCore.Application.Security;
using BizCore.Domain.Enums;
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
        return await AccountAccess.Mutate(_context, _currentUser, command.UserId, async (caller, user) => {


        // Cannot delete yourself
        if (user.Id == _currentUser.UserId)
            throw new ForbiddenAccessException(
                "You cannot delete your own account.");

        await AccountAccess.ProtectLastAdmin(_context, user, cancellationToken);
        foreach (var employee in await _context.Employees.IgnoreQueryFilters().Where(x => x.CompanyId == user.CompanyId && x.UserId == user.Id).ToListAsync(cancellationToken)) employee.UserId = null;
        foreach (var supplier in await _context.Suppliers.Where(x => x.CompanyId == user.CompanyId && x.PortalUserId == user.Id).ToListAsync(cancellationToken)) supplier.PortalUserId = null;
        _context.Users.Remove(user);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
        }, cancellationToken);
    }
}