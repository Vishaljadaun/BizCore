using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Common;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.Operations;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Application.Operations;

public record PageResult<T>(List<T> Items, int TotalCount, int Page, int PageSize, int TotalPages);
public record ListOptions(string? Search = null, string? Status = null, Guid? ParentId = null,
    bool Mine = false, bool LowStock = false, int Page = 1, int PageSize = 20);
public record ProjectInput(string Name, string Description, DateOnly? DueDate);
public record TaskInput(Guid ProjectId, string Title, string Description, Guid? AssignedUserId, DateOnly? DueDate, string Priority);
public record TimeInput(Guid TaskId, DateOnly Date, int Minutes, string Note);
public record SupplierInput(string Name, string Email, string Phone, string Address, Guid? PortalUserId, bool IsActive = true);
public record ContractInput(Guid SupplierId, string Title, string Terms, DateOnly StartDate, DateOnly EndDate, decimal Value);
public record ProductInput(string Sku, string Name, string Unit, int ReorderLevel, decimal UnitCost, bool IsActive = true);
public record StockInput(int Delta, string Reason, Guid RequestId);
public record OrderLineInput(Guid ProductId, int Quantity, decimal UnitCost);
public record OrderInput(Guid SupplierId, DateOnly? ExpectedDate, string Notes, List<OrderLineInput> Lines);
public record InvoiceLineInput(string Description, decimal Quantity, decimal UnitPrice);
public record InvoiceInput(string CustomerName, string CustomerEmail, DateOnly IssueDate, DateOnly DueDate, string Notes, decimal TaxPercent, List<InvoiceLineInput> Lines);
public record PaymentInput(decimal Amount, DateOnly Date, string Reference, Guid RequestId);
public record ExpenseInput(string Description, string Category, Guid? SupplierId, decimal Amount, DateOnly Date);
public record StateInput(string Status, DateOnly? Date = null);

// Explicit tenant predicates are used on every query. Role and account status are
// re-read from the database; stale JWT claims cannot grant operations access.
public partial class OperationsService(IApplicationDbContext db, ICurrentUserService current)
{
    public static bool Manager(User u) => u.Role is UserRole.Manager or UserRole.CompanyAdmin or UserRole.SuperAdmin;
    public static bool Admin(User u) => u.Role is UserRole.CompanyAdmin or UserRole.SuperAdmin;
    private static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow);
    private async Task<User> Caller(string access, CancellationToken ct)
    {
        var u = await db.Users.IgnoreQueryFilters().Include(x => x.Company).FirstOrDefaultAsync(x => x.Id == current.UserId && x.CompanyId == current.CompanyId, ct);
        if (u == null || !u.IsActive || !u.Company.IsActive) throw new ForbiddenAccessException("Your company account is not active.");
        if (access == "admin" && !Admin(u) || access == "manage" && !Manager(u) || access == "staff" && u.Role == UserRole.Vendor)
            throw new ForbiddenAccessException("Your role cannot perform this action.");
        return u;
    }
    private async Task<object> Write(string access, string action, Func<User, Task<object>> change, CancellationToken ct)
    {
        var u = await Caller(access, ct);
        // A company-wide transaction lock makes cross-module stock/expense and
        // payment writes atomic and protects number allocation and state changes.
        return await db.WithEmployeeLockAsync(u.CompanyId, async () => {
            var result = await change(u);
            db.AuditLogs.Add(new AuditLog { CompanyId = u.CompanyId, UserId = u.Id, Action = action, Entity = "Operations", EntityId = result is BaseEntity e ? e.Id.ToString() : "", IpAddress = current.IpAddress });
            await db.SaveChangesAsync(ct);
            return result;
        }, ct);
    }
    private static void Require(bool condition, string message) { if (!condition) throw new ValidationException("request", message); }
    private static void Conflict(bool condition, string message) { if (condition) throw new ConflictException(message); }
    private static string Text(string? value, int max, bool required = true)
    {
        var text = value?.Trim() ?? "";
        Require((!required || text.Length > 0) && text.Length <= max, $"Enter {(required ? "1" : "0")}–{max} characters."); return text;
    }
    private static decimal Money(decimal value, bool positive = false)
    {
        Require(value >= (positive ? 0.01m : 0) && value <= 1_000_000_000m && decimal.Round(value, 2) == value, "Enter a valid amount with at most two decimal places (maximum 1 billion INR)."); return value;
    }
    private static decimal Round(decimal value) => decimal.Round(value, 2, MidpointRounding.AwayFromZero);
    private static void DateRange(DateOnly start, DateOnly end) => Require(start != default && end >= start, "End date must be on or after the start date.");
    private static async Task<T> Owned<T>(IQueryable<T> query, Guid id, Guid company, CancellationToken ct) where T : BaseTenantEntity =>
        await query.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == company, ct) ?? throw new NotFoundException(typeof(T).Name, id);
    private static async Task<PageResult<T>> Page<T>(IQueryable<T> query, ListOptions o, CancellationToken ct)
    {
        var page = Math.Clamp(o.Page, 1, 1_000_000); var size = Math.Clamp(o.PageSize, 1, 100);
        var count = await query.CountAsync(ct);
        return new(await query.Skip((page - 1) * size).Take(size).ToListAsync(ct), count, page, size, (int)Math.Ceiling(count / (double)size));
    }
    private async Task ActiveSupplier(Guid id, User u, CancellationToken ct)
    { Require((await Owned(db.Suppliers, id, u.CompanyId, ct)).IsActive, "This supplier is inactive."); }
    private async Task<Guid> VendorId(User u, CancellationToken ct) =>
        await db.Suppliers.Where(x => x.CompanyId == u.CompanyId && x.PortalUserId == u.Id && x.IsActive).Select(x => (Guid?)x.Id).SingleOrDefaultAsync(ct)
        ?? throw new NotFoundException("Linked supplier profile", u.Id);

    public async Task<object> Lookups(string? search, CancellationToken ct)
    {
        var u = await Caller("staff", ct); var term = (search ?? "").Trim().ToLower();
        var users = db.Users.AsNoTracking().Where(x => x.CompanyId == u.CompanyId && x.IsActive);
        if (!Manager(u)) users = users.Where(x => x.Id == u.Id);
        return await users.Where(x => (x.FirstName + " " + x.LastName + " " + x.Email).ToLower().Contains(term))
            .OrderBy(x => x.FirstName).ThenBy(x => x.Id).Take(100)
            .Select(x => new { x.Id, Name = x.FirstName + " " + x.LastName, x.Email, Role = x.Role.ToString() }).ToListAsync(ct);
    }
}
