using System.Text;
using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Application.Security;

public record ChangePasswordInput(string CurrentPassword, string NewPassword);
public record ResetPasswordInput(string AdminPassword, string TemporaryPassword);

public class PasswordService(IApplicationDbContext db, ICurrentUserService current)
{
    public async Task Change(ChangePasswordInput input, CancellationToken ct)
    {
        var id = current.UserId ?? throw new ForbiddenAccessException("Sign in first.");
        await db.WithEmployeeLockAsync(id, async () => {
            var caller = await AccountAccess.Caller(db, current, ct);
            Verify(input.CurrentPassword, caller);
            Validate(input.NewPassword);
            if (BCrypt.Net.BCrypt.Verify(input.NewPassword, caller.PasswordHash))
                throw new ValidationException("newPassword", "Choose a different password.");
            caller.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.NewPassword, 12);
            caller.MustChangePassword = false;
            await AccountAccess.RevokeSessions(db, caller, ct);
            Audit(caller, caller.Id, "ChangePassword");
            await db.SaveChangesAsync(ct); return true;
        }, ct);
    }

    public async Task Reset(Guid id, ResetPasswordInput input, CancellationToken ct)
    {
        await db.WithEmployeeLockAsync(id, async () => {
            var caller = await AccountAccess.Caller(db, current, ct, admin: true);
            var target = await AccountAccess.Target(db, caller, id, ct);
            if (target.Id == caller.Id) throw new ValidationException("user", "Use Change password for your own account.");
            Verify(input.AdminPassword, caller); Validate(input.TemporaryPassword);
            target.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.TemporaryPassword, 12);
            target.MustChangePassword = true;
            await AccountAccess.RevokeSessions(db, target, ct);
            Audit(caller, target.Id, "ResetPassword");
            await db.SaveChangesAsync(ct); return true;
        }, ct);
    }
    public static void Validate(string? password)
    {
        if (password == null || password.Length < 12 || Encoding.UTF8.GetByteCount(password) > 72 ||
            !password.Any(char.IsUpper) || !password.Any(char.IsLower) || !password.Any(char.IsDigit) || !password.Any(c => !char.IsLetterOrDigit(c)))
            throw new ValidationException("password", "Use at least 12 characters with uppercase, lowercase, a number and a symbol; maximum 72 UTF-8 bytes.");
    }
    private static void Verify(string? password, User user)
    {
        if (string.IsNullOrEmpty(password) || Encoding.UTF8.GetByteCount(password) > 72 || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            throw new ValidationException("currentPassword", "Current password is incorrect.");
    }
    private void Audit(User caller, Guid target, string action) => db.AuditLogs.Add(new AuditLog {
        CompanyId = caller.CompanyId, UserId = caller.Id, Entity = "User", EntityId = target.ToString(), Action = action, IpAddress = current.IpAddress
    });
}
