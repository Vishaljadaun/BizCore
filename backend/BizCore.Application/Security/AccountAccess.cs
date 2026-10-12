using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Application.Security;

public static class AccountAccess
{
    // Company lock protects last-admin and email invariants; user lock coordinates
    // credential changes with concurrent login/refresh. Always acquire in this order.
    public static async Task<T> Mutate<T>(IApplicationDbContext db, ICurrentUserService current, Guid id,
        Func<User, User, Task<T>> action, CancellationToken ct)
    {
        var companyId = await db.Users.IgnoreQueryFilters().AsNoTracking()
            .Where(x => x.Id == id && (current.UserRole == "SuperAdmin" || x.CompanyId == current.CompanyId))
            .Select(x => (Guid?)x.CompanyId).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("User", id);
        return await db.WithEmployeeLockAsync(companyId, () => db.WithEmployeeLockAsync(id, async () => {
            var caller = await Caller(db, current, ct, admin: true);
            var target = await Target(db, caller, id, ct);
            return await action(caller, target);
        }, ct), ct);
    }

    public static async Task<User> Caller(IApplicationDbContext db, ICurrentUserService current, CancellationToken ct, bool admin = false)
    {
        var user = await db.Users.IgnoreQueryFilters().Include(x => x.Company)
            .FirstOrDefaultAsync(x => x.Id == current.UserId && x.CompanyId == current.CompanyId, ct);
        if (user == null || !user.IsActive || !user.Company.IsActive)
            throw new ForbiddenAccessException("An active company account is required.");
        if (admin && user.Role is not (UserRole.CompanyAdmin or UserRole.SuperAdmin))
            throw new ForbiddenAccessException("Administrator access is required.");
        return user;
    }

    public static async Task<User> Target(IApplicationDbContext db, User caller, Guid id, CancellationToken ct)
    {
        var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id &&
            (caller.Role == UserRole.SuperAdmin || x.CompanyId == caller.CompanyId), ct)
            ?? throw new NotFoundException("User", id);
        if (user.Id != caller.Id && (user.Role == UserRole.SuperAdmin ||
            user.Role == UserRole.CompanyAdmin && caller.Role != UserRole.SuperAdmin))
            throw new ForbiddenAccessException("You cannot modify this administrator account.");
        return user;
    }

    public static async Task ProtectLastAdmin(IApplicationDbContext db, User user, CancellationToken ct)
    {
        if (user.IsActive && user.Role == UserRole.CompanyAdmin &&
            !await db.Users.IgnoreQueryFilters().AnyAsync(x => x.CompanyId == user.CompanyId && x.Id != user.Id && x.IsActive && x.Role == UserRole.CompanyAdmin, ct))
            throw new ConflictException("Keep at least one active company administrator.");
    }

    public static async Task RevokeSessions(IApplicationDbContext db, User user, CancellationToken ct)
    {
        user.CredentialVersion++;
        foreach (var token in await db.RefreshTokens.IgnoreQueryFilters()
            .Where(x => x.UserId == user.Id && !x.IsRevoked).ToListAsync(ct)) token.IsRevoked = true;
    }
}
