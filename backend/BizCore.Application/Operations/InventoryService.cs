using BizCore.Application.Common.Exceptions;
using BizCore.Domain.Entities.Operations;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Application.Operations;
public partial class OperationsService
{
    public async Task<object> Suppliers(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("any", ct);
        if (!Manager(u) && u.Role != UserRole.Vendor) throw new ForbiddenAccessException("Supplier records require a manager account.");
        var q = db.Suppliers.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (u.Role == UserRole.Vendor) q = q.Where(x => x.PortalUserId == u.Id && x.IsActive);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Name.ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderBy(x => x.Name).ThenBy(x => x.Id), o, ct);
    }
    public Task<object> SaveSupplier(Guid? id, SupplierInput input, CancellationToken ct) => Write("manage", "SaveSupplier", async u => {
        if (input.PortalUserId.HasValue) {
            Require(await db.Users.AnyAsync(x => x.Id == input.PortalUserId && x.CompanyId == u.CompanyId && x.IsActive && x.Role == UserRole.Vendor, ct), "Select an active Vendor account from your company.");
            Conflict(await db.Suppliers.AnyAsync(x => x.CompanyId == u.CompanyId && x.PortalUserId == input.PortalUserId && x.Id != id, ct), "This portal account is already linked to another supplier.");
        }
        var supplier = id.HasValue ? await Owned(db.Suppliers, id.Value, u.CompanyId, ct) : new Supplier { CompanyId = u.CompanyId };
        supplier.Name = Text(input.Name, 150); supplier.Email = Text(input.Email, 256, false); supplier.Phone = Text(input.Phone, 40, false);
        supplier.Address = Text(input.Address, 1000, false); supplier.PortalUserId = input.PortalUserId; supplier.IsActive = input.IsActive;
        if (!id.HasValue) db.Suppliers.Add(supplier); return supplier;
    }, ct);
    public async Task<object> Contracts(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("any", ct);
        if (!Manager(u) && u.Role != UserRole.Vendor) throw new ForbiddenAccessException("Contracts require manager access.");
        var q = db.SupplierContracts.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (u.Role == UserRole.Vendor) { var supplier = await VendorId(u, ct); q = q.Where(x => x.SupplierId == supplier && x.Status != "Draft"); }
        if (o.ParentId.HasValue) q = q.Where(x => x.SupplierId == o.ParentId);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Title.ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new { x.Id, x.SupplierId, x.Title, x.Terms, x.StartDate, x.EndDate, x.Value,
            Status = x.Status == "Active" && x.EndDate < Today ? "Expired" : x.Status,
            SupplierName = db.Suppliers.Where(s => s.Id == x.SupplierId && s.CompanyId == u.CompanyId).Select(s => s.Name).FirstOrDefault() }), o, ct);
    }
    public Task<object> SaveContract(Guid? id, ContractInput input, CancellationToken ct) => Write("manage", "SaveContract", async u => {
        await ActiveSupplier(input.SupplierId, u, ct); DateRange(input.StartDate, input.EndDate);
        var c = id.HasValue ? await Owned(db.SupplierContracts, id.Value, u.CompanyId, ct) : new SupplierContract { CompanyId = u.CompanyId };
        Require(c.Status == "Draft", "Only draft contracts can be edited.");
        c.SupplierId = input.SupplierId; c.Title = Text(input.Title, 200); c.Terms = Text(input.Terms, 4000);
        c.StartDate = input.StartDate; c.EndDate = input.EndDate; c.Value = Money(input.Value);
        if (!id.HasValue) db.SupplierContracts.Add(c); return c;
    }, ct);
    public Task<object> ContractState(Guid id, string status, CancellationToken ct) => Write("manage", "ContractState", async u => {
        var c = await Owned(db.SupplierContracts, id, u.CompanyId, ct);
        Conflict(!(c.Status == "Draft" && status == "Active" || c.Status == "Active" && status == "Ended"), "This contract transition is not allowed.");
        if (status == "Active") { await ActiveSupplier(c.SupplierId, u, ct); Require(c.EndDate >= Today, "An expired contract cannot be activated."); }
        c.Status = status; return c;
    }, ct);
    public async Task<object> Products(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("manage", ct); var q = db.Products.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (o.LowStock) q = q.Where(x => x.IsActive && x.OnHand <= x.ReorderLevel);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => (x.Name + " " + x.Sku).ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderBy(x => x.Name).ThenBy(x => x.Id), o, ct);
    }
    public Task<object> SaveProduct(Guid? id, ProductInput input, CancellationToken ct) => Write("manage", "SaveProduct", async u => {
        var sku = Text(input.Sku, 50).ToUpperInvariant();
        Conflict(await db.Products.AnyAsync(x => x.CompanyId == u.CompanyId && x.Sku == sku && x.Id != id, ct), "This SKU already exists.");
        Require(input.ReorderLevel is >= 0 and <= 1_000_000, "Reorder level must be 0–1,000,000 whole units.");
        var p = id.HasValue ? await Owned(db.Products, id.Value, u.CompanyId, ct) : new Product { CompanyId = u.CompanyId };
        p.Sku = sku; p.Name = Text(input.Name, 150); p.Unit = Text(input.Unit, 30); p.ReorderLevel = input.ReorderLevel;
        p.UnitCost = Money(input.UnitCost); p.IsActive = input.IsActive;
        if (!id.HasValue) db.Products.Add(p); return p;
    }, ct);
    public Task<object> AdjustStock(Guid id, StockInput input, CancellationToken ct) => Write("manage", "AdjustStock", async u => {
        Require(input.RequestId != Guid.Empty && input.Delta != 0 && Math.Abs((long)input.Delta) <= 1_000_000, "Enter a non-zero stock change of at most 1,000,000 units and a request ID.");
        var reason = Text(input.Reason, 500);
        var previous = await db.StockMovements.FirstOrDefaultAsync(x => x.CompanyId == u.CompanyId && x.RequestId == input.RequestId, ct);
        if (previous != null) { Conflict(previous.ProductId != id || previous.Delta != input.Delta || previous.Reason != reason, "This request ID was already used for a different stock change."); return previous; }
        var p = await Owned(db.Products, id, u.CompanyId, ct); Require(p.IsActive, "This product is inactive.");
        Conflict((long)p.OnHand + input.Delta < 0 || (long)p.OnHand + input.Delta > 1_000_000, "Stock must stay between 0 and 1,000,000 units.");
        p.OnHand += input.Delta;
        var m = new StockMovement { CompanyId = u.CompanyId, ProductId = id, UserId = u.Id, Delta = input.Delta, BalanceAfter = p.OnHand, Reason = reason, RequestId = input.RequestId };
        db.StockMovements.Add(m); return m;
    }, ct);
    public async Task<object> Movements(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("manage", ct); var q = db.StockMovements.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (o.ParentId.HasValue) q = q.Where(x => x.ProductId == o.ParentId);
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new { x.Id, x.ProductId, x.OrderId, x.Delta, x.BalanceAfter, x.Reason, x.CreatedAt,
            ProductName = db.Products.Where(p => p.CompanyId == u.CompanyId && p.Id == x.ProductId).Select(p => p.Name).FirstOrDefault() }), o, ct);
    }
    public async Task<object> Orders(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("any", ct);
        if (!Manager(u) && u.Role != UserRole.Vendor) throw new ForbiddenAccessException("Purchase orders require manager access.");
        var q = db.PurchaseOrders.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (u.Role == UserRole.Vendor) { var supplier = await VendorId(u, ct); q = q.Where(x => x.SupplierId == supplier && x.Status != "Draft"); }
        if (o.ParentId.HasValue) q = q.Where(x => x.SupplierId == o.ParentId);
        if (!string.IsNullOrEmpty(o.Status)) q = q.Where(x => x.Status == o.Status);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Number.ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new { x.Id, x.Number, x.SupplierId, x.ExpectedDate, x.Notes, x.Status, x.Total,
            SupplierName = db.Suppliers.Where(s => s.Id == x.SupplierId && s.CompanyId == u.CompanyId).Select(s => s.Name).FirstOrDefault(),
            Lines = db.PurchaseLines.Where(l => l.CompanyId == u.CompanyId && l.OrderId == x.Id).OrderBy(l => l.Id).Select(l => new { l.ProductId, l.Quantity, l.UnitCost,
                ProductName = db.Products.Where(p => p.CompanyId == u.CompanyId && p.Id == l.ProductId).Select(p => p.Name).FirstOrDefault() }).ToList() }), o, ct);
    }
    public Task<object> SaveOrder(Guid? id, OrderInput input, CancellationToken ct) => Write("manage", "SaveOrder", async u => {
        await ActiveSupplier(input.SupplierId, u, ct);
        Require(input.Lines is { Count: > 0 and <= 100 }, "Add 1–100 order lines.");
        Require(input.Lines.Select(x => x.ProductId).Distinct().Count() == input.Lines.Count, "Combine duplicate products into one line.");
        foreach (var line in input.Lines) {
            Require((await Owned(db.Products, line.ProductId, u.CompanyId, ct)).IsActive, "Choose active products.");
            Require(line.Quantity is > 0 and <= 1_000_000, "Enter 1–1,000,000 whole units."); Money(line.UnitCost);
        }
        var order = id.HasValue ? await Owned(db.PurchaseOrders, id.Value, u.CompanyId, ct) : new PurchaseOrder { CompanyId = u.CompanyId,
            Number = "PO-" + (await db.PurchaseOrders.CountAsync(x => x.CompanyId == u.CompanyId, ct) + 1).ToString("D5") };
        Conflict(order.Status != "Draft", "Only draft orders can be edited.");
        order.SupplierId = input.SupplierId; order.ExpectedDate = input.ExpectedDate; order.Notes = Text(input.Notes, 1000, false);
        order.Total = Money(input.Lines.Sum(x => x.Quantity * x.UnitCost));
        if (id.HasValue) db.PurchaseLines.RemoveRange(await db.PurchaseLines.Where(x => x.CompanyId == u.CompanyId && x.OrderId == id).ToListAsync(ct));
        else db.PurchaseOrders.Add(order);
        db.PurchaseLines.AddRange(input.Lines.Select(l => new PurchaseLine { CompanyId = u.CompanyId, OrderId = order.Id, ProductId = l.ProductId, Quantity = l.Quantity, UnitCost = l.UnitCost }));
        return order;
    }, ct);
    public Task<object> OrderState(Guid id, string status, CancellationToken ct) => Write("any", "OrderState", async u => {
        if (!Manager(u) && u.Role != UserRole.Vendor) throw new ForbiddenAccessException("Purchase orders require manager access.");
        var order = await Owned(db.PurchaseOrders, id, u.CompanyId, ct);
        if (u.Role == UserRole.Vendor) {
            if (order.SupplierId != await VendorId(u, ct) || status != "Acknowledged") throw new ForbiddenAccessException("You can acknowledge only your own placed orders.");
            Conflict(order.Status != "Placed", "Only placed orders can be acknowledged.");
        } else {
            var allowed = status switch { "Placed" => order.Status == "Draft", "Received" => order.Status is "Placed" or "Acknowledged", "Cancelled" => order.Status is "Draft" or "Placed" or "Acknowledged", _ => false };
            Conflict(!allowed, "This order transition is not allowed.");
            if (status == "Placed") await ActiveSupplier(order.SupplierId, u, ct);
        }
        if (status == "Received") {
            var lines = await db.PurchaseLines.Where(x => x.CompanyId == u.CompanyId && x.OrderId == id).ToListAsync(ct);
            foreach (var line in lines) {
                var p = await Owned(db.Products, line.ProductId, u.CompanyId, ct);
                Conflict((long)p.OnHand + line.Quantity > 1_000_000, "Receiving this order would exceed the stock limit.");
                p.OnHand += line.Quantity;
                db.StockMovements.Add(new StockMovement { CompanyId = u.CompanyId, ProductId = p.Id, OrderId = id, UserId = u.Id,
                    Delta = line.Quantity, BalanceAfter = p.OnHand, Reason = "Received " + order.Number, RequestId = Guid.NewGuid() });
            }
            if (order.Total > 0) db.Expenses.Add(new Expense { CompanyId = u.CompanyId, SupplierId = order.SupplierId, OrderId = id,
                Description = "Purchase " + order.Number, Category = "Inventory", Amount = order.Total, Date = Today });
        }
        order.Status = status; return order;
    }, ct);
}
