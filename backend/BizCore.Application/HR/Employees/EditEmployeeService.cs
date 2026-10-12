using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Security;
using BizCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Application.HR.Employees;

public record EditEmployeeInput(string FirstName, string LastName, string Email, string? Phone,
    string Designation, Guid DepartmentId, DateOnly JoiningDate, decimal Salary);
public record EmployeeStatusInput(bool IsActive);
public class EditEmployeeService(IApplicationDbContext db, ICurrentUserService current)
{
    public async Task Edit(Guid id, EditEmployeeInput input, CancellationToken ct)
    {
        var caller = await AccountAccess.Caller(db, current, ct, admin: true);
        await db.WithEmployeeLockAsync(caller.CompanyId, async () => {
            var employee = await db.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == caller.CompanyId, ct)
                ?? throw new NotFoundException("Employee", id);
            if (!await db.Departments.IgnoreQueryFilters().AnyAsync(x => x.Id == input.DepartmentId && x.CompanyId == caller.CompanyId && x.IsActive, ct))
                throw new ValidationException("departmentId", "Choose an active department in your company.");
            var email = input.Email.Trim().ToLowerInvariant();
            if (email.Length > 255 || !System.Net.Mail.MailAddress.TryCreate(email, out var parsed) || parsed.Address != email)
                throw new ValidationException("email", "Enter a valid email address.");
            if (await db.Employees.IgnoreQueryFilters().AnyAsync(x => x.CompanyId == caller.CompanyId && x.Id != id && x.Email == email, ct))
                throw new ConflictException("Employee email already exists in your company.");
            if (input.JoiningDate == default || input.Salary <= 0 || input.Salary > 1_000_000_000 || decimal.Round(input.Salary, 2) != input.Salary)
                throw new ValidationException("employee", "Enter a joining date and positive salary with at most two decimals (maximum 1 billion INR).");
            employee.FirstName = Text(input.FirstName, 100); employee.LastName = Text(input.LastName, 100);
            employee.Email = email; employee.Phone = Text(input.Phone ?? "", 20, false);
            employee.Designation = Text(input.Designation, 100); employee.DepartmentId = input.DepartmentId;
            employee.JoiningDate = input.JoiningDate; employee.Salary = input.Salary;
            Audit(caller, id, "EditEmployee"); await db.SaveChangesAsync(ct); return true;
        }, ct);
    }
    public async Task Status(Guid id, bool active, CancellationToken ct)
    {
        var caller = await AccountAccess.Caller(db, current, ct, admin: true);
        await db.WithEmployeeLockAsync(caller.CompanyId, () => db.WithEmployeeLockAsync(id, async () => {
            var employee = await db.Employees.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == caller.CompanyId, ct)
                ?? throw new NotFoundException("Employee", id);
            if (!active && employee.IsActive)
            {
                if (await db.Attendances.IgnoreQueryFilters().AnyAsync(x => x.EmployeeId == id && x.CompanyId == caller.CompanyId && x.ClockOut == null, ct))
                    throw new ConflictException("Clock out this employee before deactivating the record.");
                if (employee.UserId.HasValue)
                {
                    var linked = await AccountAccess.Target(db, caller, employee.UserId.Value, ct);
                    if (linked.Id == caller.Id) throw new ForbiddenAccessException("You cannot deactivate your own linked account.");
                    await AccountAccess.ProtectLastAdmin(db, linked, ct);
                    await db.WithEmployeeLockAsync(linked.Id, async () => {
                        linked.IsActive = false; await AccountAccess.RevokeSessions(db, linked, ct);
                        await db.SaveChangesAsync(ct); return true;
                    }, ct);
                }
                foreach (var dept in await db.Departments.IgnoreQueryFilters().Where(x => x.CompanyId == caller.CompanyId && x.ManagerId == id).ToListAsync(ct)) dept.ManagerId = null;
            }
            employee.IsActive = active;
            Audit(caller, id, active ? "ReactivateEmployee" : "DeactivateEmployee");
            await db.SaveChangesAsync(ct); return true;
        }, ct), ct);
    }
    private static string Text(string value, int max, bool required = true)
    {
        if ((required && string.IsNullOrWhiteSpace(value)) || value.Trim().Length > max)
            throw new ValidationException("employee", $"Enter {(required ? 1 : 0)}–{max} characters.");
        return value.Trim();
    }
    private void Audit(User caller, Guid id, string action) => db.AuditLogs.Add(new AuditLog {
        CompanyId = caller.CompanyId, UserId = caller.Id, Entity = "Employee", EntityId = id.ToString(), Action = action, IpAddress = current.IpAddress
    });
}
