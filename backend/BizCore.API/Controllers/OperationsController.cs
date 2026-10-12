using System.Text;
using BizCore.Application.Operations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BizCore.API.Controllers;
[ApiController, Route("api/operations"), Authorize]
public class OperationsController(OperationsService service) : ControllerBase
{
    // Fine-grained authorization lives in the application service and checks the
    // current database role on every request, including vendor ownership.
    [HttpGet("people")] public async Task<IActionResult> People([FromQuery] string? search, CancellationToken ct) => Ok(await service.Lookups(search, ct));
    [HttpGet("projects")] public async Task<IActionResult> Projects([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Projects(o, ct));
    [HttpPost("projects")] public async Task<IActionResult> CreateProject(ProjectInput b, CancellationToken ct) => StatusCode(201, await service.SaveProject(null, b, ct));
    [HttpPut("projects/{id:guid}")] public async Task<IActionResult> EditProject(Guid id, ProjectInput b, CancellationToken ct) => Ok(await service.SaveProject(id, b, ct));
    [HttpPut("projects/{id:guid}/status")] public async Task<IActionResult> ProjectStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.ProjectState(id, b.Status, ct));
    [HttpGet("tasks")] public async Task<IActionResult> Tasks([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Tasks(o, ct));
    [HttpPost("tasks")] public async Task<IActionResult> CreateTask(TaskInput b, CancellationToken ct) => StatusCode(201, await service.SaveTask(null, b, ct));
    [HttpPut("tasks/{id:guid}")] public async Task<IActionResult> EditTask(Guid id, TaskInput b, CancellationToken ct) => Ok(await service.SaveTask(id, b, ct));
    [HttpPut("tasks/{id:guid}/status")] public async Task<IActionResult> TaskStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.TaskState(id, b.Status, ct));
    [HttpGet("time-entries")] public async Task<IActionResult> TimeEntries([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.TimeEntries(o, ct));
    [HttpPost("time-entries")] public async Task<IActionResult> LogTime(TimeInput b, CancellationToken ct) => StatusCode(201, await service.AddTime(b, ct));
    [HttpDelete("time-entries/{id:guid}")] public async Task<IActionResult> DeleteTime(Guid id, CancellationToken ct) => Ok(await service.DeleteTime(id, ct));
    [HttpGet("suppliers")] public async Task<IActionResult> Suppliers([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Suppliers(o, ct));
    [HttpPost("suppliers")] public async Task<IActionResult> CreateSupplier(SupplierInput b, CancellationToken ct) => StatusCode(201, await service.SaveSupplier(null, b, ct));
    [HttpPut("suppliers/{id:guid}")] public async Task<IActionResult> EditSupplier(Guid id, SupplierInput b, CancellationToken ct) => Ok(await service.SaveSupplier(id, b, ct));
    [HttpGet("contracts")] public async Task<IActionResult> Contracts([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Contracts(o, ct));
    [HttpPost("contracts")] public async Task<IActionResult> CreateContract(ContractInput b, CancellationToken ct) => StatusCode(201, await service.SaveContract(null, b, ct));
    [HttpPut("contracts/{id:guid}")] public async Task<IActionResult> EditContract(Guid id, ContractInput b, CancellationToken ct) => Ok(await service.SaveContract(id, b, ct));
    [HttpPut("contracts/{id:guid}/status")] public async Task<IActionResult> ContractStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.ContractState(id, b.Status, ct));
    [HttpGet("products")] public async Task<IActionResult> Products([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Products(o, ct));
    [HttpPost("products")] public async Task<IActionResult> CreateProduct(ProductInput b, CancellationToken ct) => StatusCode(201, await service.SaveProduct(null, b, ct));
    [HttpPut("products/{id:guid}")] public async Task<IActionResult> EditProduct(Guid id, ProductInput b, CancellationToken ct) => Ok(await service.SaveProduct(id, b, ct));
    [HttpPost("products/{id:guid}/stock")] public async Task<IActionResult> Stock(Guid id, StockInput b, CancellationToken ct) => Ok(await service.AdjustStock(id, b, ct));
    [HttpGet("movements")] public async Task<IActionResult> Movements([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Movements(o, ct));
    [HttpGet("orders")] public async Task<IActionResult> Orders([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Orders(o, ct));
    [HttpPost("orders")] public async Task<IActionResult> CreateOrder(OrderInput b, CancellationToken ct) => StatusCode(201, await service.SaveOrder(null, b, ct));
    [HttpPut("orders/{id:guid}")] public async Task<IActionResult> EditOrder(Guid id, OrderInput b, CancellationToken ct) => Ok(await service.SaveOrder(id, b, ct));
    [HttpPut("orders/{id:guid}/status")] public async Task<IActionResult> OrderStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.OrderState(id, b.Status, ct));
    [HttpGet("invoices")] public async Task<IActionResult> Invoices([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Invoices(o, ct));
    [HttpPost("invoices")] public async Task<IActionResult> CreateInvoice(InvoiceInput b, CancellationToken ct) => StatusCode(201, await service.SaveInvoice(null, b, ct));
    [HttpPut("invoices/{id:guid}")] public async Task<IActionResult> EditInvoice(Guid id, InvoiceInput b, CancellationToken ct) => Ok(await service.SaveInvoice(id, b, ct));
    [HttpPut("invoices/{id:guid}/status")] public async Task<IActionResult> InvoiceStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.InvoiceState(id, b.Status, ct));
    [HttpPost("invoices/{id:guid}/payments")] public async Task<IActionResult> Payment(Guid id, PaymentInput b, CancellationToken ct) => StatusCode(201, await service.AddPayment(id, b, ct));
    [HttpGet("expenses")] public async Task<IActionResult> Expenses([FromQuery] ListOptions o, CancellationToken ct) => Ok(await service.Expenses(o, ct));
    [HttpPost("expenses")] public async Task<IActionResult> CreateExpense(ExpenseInput b, CancellationToken ct) => StatusCode(201, await service.SaveExpense(null, b, ct));
    [HttpPut("expenses/{id:guid}")] public async Task<IActionResult> EditExpense(Guid id, ExpenseInput b, CancellationToken ct) => Ok(await service.SaveExpense(id, b, ct));
    [HttpPut("expenses/{id:guid}/status")] public async Task<IActionResult> ExpenseStatus(Guid id, StateInput b, CancellationToken ct) => Ok(await service.ExpenseState(id, b, ct));
    [HttpGet("reports")] public async Task<IActionResult> Report([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) => Ok(await service.Report(from, to, ct));
    [HttpGet("reports/export")] public async Task<IActionResult> ReportExport([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) => File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(await service.FinanceCsv(from, to, ct))).ToArray(), "text/csv", $"cash-flow-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv");
}
