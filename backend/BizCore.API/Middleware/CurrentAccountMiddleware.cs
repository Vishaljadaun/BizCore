using System.Security.Claims;
using BizCore.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace BizCore.API.Middleware;

// Run after JWT authentication and BEFORE role authorization. Claims remain
// signed identity, but current account state is authoritative for access.
public class CurrentAccountMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, IApplicationDbContext db)
    {
        if (http.User.Identity?.IsAuthenticated != true ||
            http.GetEndpoint()?.Metadata.GetMetadata<IAllowAnonymous>() != null)
        { await next(http); return; }

        if (!Guid.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ||
            !Guid.TryParse(http.User.FindFirstValue("company_id"), out var companyId))
        { await Reject(http, 401, "Invalid session."); return; }

        var user = await db.Users.IgnoreQueryFilters().AsNoTracking().Include(x => x.Company)
            .FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId, http.RequestAborted);
        if (user == null || !user.IsActive || !user.Company.IsActive)
        { await Reject(http, 403, "Your account or company is inactive."); return; }

        // Existing tokens issued before this migration represent version zero.
        var version = http.User.FindFirstValue("credential_version") ?? "0";
        if (!int.TryParse(version, out var parsed) || parsed != user.CredentialVersion)
        { await Reject(http, 401, "Your session was revoked. Sign in again."); return; }

        var identity = (ClaimsIdentity)http.User.Identity!;
        Replace(identity, ClaimTypes.Role, user.Role.ToString());
        Replace(identity, ClaimTypes.Email, user.Email);
        Replace(identity, "first_name", user.FirstName);
        Replace(identity, "last_name", user.LastName);
        Replace(identity, "company_code", user.Company.Slug);
        Replace(identity, "must_change_password", user.MustChangePassword.ToString());
        foreach (var claim in identity.FindAll("employee_id").ToList()) identity.RemoveClaim(claim);
        if (user.EmployeeId.HasValue) identity.AddClaim(new Claim("employee_id", user.EmployeeId.Value.ToString()));
        var path = http.Request.Path.Value?.TrimEnd('/').ToLowerInvariant();
        if (user.MustChangePassword && path is not ("/api/auth/change-password" or "/api/auth/logout" or "/api/auth/me"))
        { await Reject(http, 403, "Change your temporary password before continuing.", "password_change_required"); return; }
        await next(http);
    }

    private static void Replace(ClaimsIdentity identity, string type, string value)
    {
        foreach (var claim in identity.FindAll(type).ToList()) identity.RemoveClaim(claim);
        identity.AddClaim(new Claim(type, value));
    }
    private static async Task Reject(HttpContext http, int status, string message, string? code = null)
    { http.Response.StatusCode = status; await http.Response.WriteAsJsonAsync(new { message, code }); }
}
