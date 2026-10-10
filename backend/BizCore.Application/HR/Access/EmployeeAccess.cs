using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Application.HR.Access;

// Re-read membership and links so unlinked/deactivated accounts cannot keep
// using a stale employee_id or role claim until their access token expires.
public static class EmployeeAccess
{
    public static bool CanManage(User user) => user.Role is
        UserRole.SuperAdmin or UserRole.CompanyAdmin or UserRole.Manager;

    public static async Task<User> GetCallerAsync(IApplicationDbContext db,
        ICurrentUserService current, CancellationToken ct)
    {
        if (!current.UserId.HasValue || !current.CompanyId.HasValue)
            throw new ForbiddenAccessException("An authenticated company account is required.");
        var caller = await db.Users.IgnoreQueryFilters().Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Id == current.UserId &&
                u.CompanyId == current.CompanyId, ct);
        if (caller == null || !caller.IsActive || !caller.Company.IsActive ||
            caller.Role == UserRole.Vendor)
            throw new ForbiddenAccessException("Your account cannot access employee records.");
        return caller;
    }

    public static async Task<Employee> RequireAsync(IApplicationDbContext db,
        User caller, Guid? employeeId, CancellationToken ct)
    {
        var target = employeeId ?? caller.EmployeeId;
        if (!target.HasValue)
            throw new NotFoundException("Employee profile", caller.Id);
        if (!CanManage(caller) && target != caller.EmployeeId)
            throw new ForbiddenAccessException("You can only access your own employee record.");
        var employee = await db.Employees.IgnoreQueryFilters()
            .FirstOrDefaultAsync(e => e.Id == target && e.CompanyId == caller.CompanyId && e.IsActive, ct)
            ?? throw new NotFoundException("Employee", target.Value);
        // Self-service requires a current, two-way link even for managers.
        if ((!employeeId.HasValue || !CanManage(caller)) &&
            (employee.UserId != caller.Id || caller.EmployeeId != employee.Id))
            throw new ForbiddenAccessException("Your employee profile link is no longer active.");
        return employee;
    }
}
