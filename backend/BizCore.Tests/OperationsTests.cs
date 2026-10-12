using BizCore.Application.Common.Exceptions;
using BizCore.Application.Operations;
using BizCore.Domain.Entities.Operations;
using BizCore.Domain.Enums;
using BizCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Tests;
public class OperationsTests
{
    private static OperationsService Service(EmployeeFixture f) => new(f.Db, f.Current);
    private static async Task Admin(EmployeeFixture f) { f.User.Role = UserRole.CompanyAdmin; await f.Db.SaveChangesAsync(); }
    [Fact]
    public void Migration_snapshot_matches_Postgres_model()
    {
        var options = new DbContextOptionsBuilder<BizCoreDbContext>().UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused").Options;
        using var db = new BizCoreDbContext(options, new TestCurrentUser());
        Assert.False(db.Database.HasPendingModelChanges());
    }
    [Fact]
    public async Task Receiving_order_updates_stock_and_expense_once()
    {
        await using var f = new EmployeeFixture(); await Admin(f); var s = Service(f);
        var vendor = (Supplier)await s.SaveSupplier(null, new("Supplier", "", "", "", null), default);
        var product = (Product)await s.SaveProduct(null, new("SKU-1", "Laptop", "units", 2, 100), default);
        var order = (PurchaseOrder)await s.SaveOrder(null, new(vendor.Id, null, "", [new(product.Id, 3, 100)]), default);
        await s.OrderState(order.Id, "Placed", default); await s.OrderState(order.Id, "Received", default);
        Assert.Equal(3, product.OnHand); Assert.Equal(300, (await f.Db.Expenses.SingleAsync()).Amount);
        await Assert.ThrowsAsync<ConflictException>(() => s.OrderState(order.Id, "Received", default));
        Assert.Single(await f.Db.StockMovements.ToListAsync());
    }
    [Fact]
    public async Task Payment_is_idempotent_and_cannot_exceed_balance()
    {
        await using var f = new EmployeeFixture(); await Admin(f); var s = Service(f); var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var invoice = (Invoice)await s.SaveInvoice(null, new("Customer", "", today, today, "", 10, [new("Consulting", 2, 50)]), default);
        Assert.Equal(110, invoice.Total); await s.InvoiceState(invoice.Id, "Issued", default);
        var payment = new PaymentInput(70, today, "Bank ref", Guid.NewGuid());
        await s.AddPayment(invoice.Id, payment, default); await s.AddPayment(invoice.Id, payment, default);
        Assert.Single(await f.Db.InvoicePayments.ToListAsync()); Assert.Equal("PartPaid", invoice.Status);
        await Assert.ThrowsAsync<ConflictException>(() => s.AddPayment(invoice.Id, payment with { RequestId = Guid.NewGuid() }, default));
        await s.AddPayment(invoice.Id, payment with { Amount = 40, RequestId = Guid.NewGuid() }, default);
        Assert.Equal("Paid", invoice.Status);
        await Assert.ThrowsAsync<ConflictException>(() => s.InvoiceState(invoice.Id, "Voided", default));
    }
    [Fact]
    public async Task Stock_adjustment_never_goes_negative_and_retries_do_not_duplicate()
    {
        await using var f = new EmployeeFixture(); await Admin(f); var s = Service(f);
        var product = (Product)await s.SaveProduct(null, new("SKU", "Product", "units", 2, 10), default);
        var input = new StockInput(5, "Opening count", Guid.NewGuid());
        await s.AdjustStock(product.Id, input, default); await s.AdjustStock(product.Id, input, default);
        Assert.Equal(5, product.OnHand); Assert.Single(await f.Db.StockMovements.ToListAsync());
        await Assert.ThrowsAsync<ConflictException>(() => s.AdjustStock(product.Id, new(-6, "Issue", Guid.NewGuid()), default));
        Assert.Equal(5, product.OnHand);
    }
    [Fact]
    public async Task Employee_permissions_and_tenant_relationships_are_enforced()
    {
        await using var f = new EmployeeFixture(); var s = Service(f);
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => s.Products(new(), default));
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => s.Invoices(new(), default));
        await Admin(f);
        var foreign = new Supplier { CompanyId = Guid.NewGuid(), Name = "Another tenant" }; f.Db.Suppliers.Add(foreign); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<NotFoundException>(() => s.SaveContract(null, new(foreign.Id, "Contract", "Terms", new(2026,1,1), new(2026,12,31), 100), default));
        var project = (WorkProject)await s.SaveProject(null, new("Project", "", null), default);
        var task = (ProjectTask)await s.SaveTask(null, new(project.Id, "Task", "", null, null, "Medium"), default);
        f.User.Role = UserRole.Employee; await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => s.TaskState(task.Id, "Done", default));
        task.AssignedUserId = f.User.Id; await f.Db.SaveChangesAsync();
        await s.TaskState(task.Id, "InProgress", default);
        Assert.Equal("InProgress", task.Status);
    }
    [Fact]
    public async Task Time_logs_are_limited_to_one_day_and_project_completion_requires_finished_tasks()
    {
        await using var f = new EmployeeFixture(); await Admin(f); var s = Service(f);
        var project = (WorkProject)await s.SaveProject(null, new("Project", "", null), default);
        var task = (ProjectTask)await s.SaveTask(null, new(project.Id, "Task", "", f.User.Id, null, "High"), default);
        await s.AddTime(new(task.Id, DateOnly.FromDateTime(DateTime.UtcNow), 1440, "Day"), default);
        await Assert.ThrowsAsync<ConflictException>(() => s.AddTime(new(task.Id, DateOnly.FromDateTime(DateTime.UtcNow), 1, "Extra"), default));
        await Assert.ThrowsAsync<ConflictException>(() => s.ProjectState(project.Id, "Completed", default));
        await s.TaskState(task.Id, "Done", default); await s.ProjectState(project.Id, "Completed", default);
        Assert.Equal("Completed", project.Status);
    }
}
