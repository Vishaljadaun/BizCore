using System.Globalization;
using System.Text;
using BizCore.Application.HR.Attendance;
using BizCore.Domain.Entities.Operations;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Application.Operations;
public partial class OperationsService
{
    public async Task<object> Invoices(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("admin", ct); var q = db.Invoices.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (!string.IsNullOrEmpty(o.Status)) q = q.Where(x => x.Status == o.Status);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => (x.Number + " " + x.CustomerName).ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new { x.Id, x.Number, x.CustomerName, x.CustomerEmail,
            x.IssueDate, x.DueDate, x.Notes, x.Status, x.TaxPercent, x.Subtotal, x.Total,
            Paid = db.InvoicePayments.Where(p => p.CompanyId == u.CompanyId && p.InvoiceId == x.Id).Sum(p => p.Amount),
            Lines = db.InvoiceLines.Where(l => l.CompanyId == u.CompanyId && l.InvoiceId == x.Id).OrderBy(l => l.Id).Select(l => new { l.Description, l.Quantity, l.UnitPrice }).ToList(),
            Payments = db.InvoicePayments.Where(p => p.CompanyId == u.CompanyId && p.InvoiceId == x.Id).OrderByDescending(p => p.Date).Select(p => new { p.Amount, p.Date, p.Reference }).ToList()
        }), o, ct);
    }
    public Task<object> SaveInvoice(Guid? id, InvoiceInput input, CancellationToken ct) => Write("admin", "SaveInvoice", async u => {
        DateRange(input.IssueDate, input.DueDate); Require(input.IssueDate <= Today, "The issue date cannot be in the future.");
        Require(input.Lines is { Count: > 0 and <= 100 }, "Add 1–100 invoice lines.");
        Require(input.TaxPercent is >= 0 and <= 100 && Round(input.TaxPercent) == input.TaxPercent, "Tax percentage must be 0–100 with at most two decimals.");
        var subtotal = 0m;
        foreach (var line in input.Lines) {
            Text(line.Description, 300); Money(line.UnitPrice);
            Require(line.Quantity is > 0 and <= 1_000_000 && Round(line.Quantity) == line.Quantity, "Quantity must be positive with at most two decimal places.");
            subtotal += Round(line.Quantity * line.UnitPrice);
        }
        var invoice = id.HasValue ? await Owned(db.Invoices, id.Value, u.CompanyId, ct) : new Invoice { CompanyId = u.CompanyId,
            Number = "INV-" + (await db.Invoices.CountAsync(x => x.CompanyId == u.CompanyId, ct) + 1).ToString("D5") };
        Conflict(invoice.Status != "Draft", "Only draft invoices can be edited.");
        invoice.CustomerName = Text(input.CustomerName, 150); invoice.CustomerEmail = Text(input.CustomerEmail, 256, false);
        invoice.IssueDate = input.IssueDate; invoice.DueDate = input.DueDate; invoice.Notes = Text(input.Notes, 1000, false);
        invoice.TaxPercent = input.TaxPercent; invoice.Subtotal = Money(subtotal); invoice.Total = Money(Round(subtotal + subtotal * input.TaxPercent / 100), true);
        if (id.HasValue) db.InvoiceLines.RemoveRange(await db.InvoiceLines.Where(x => x.CompanyId == u.CompanyId && x.InvoiceId == id).ToListAsync(ct));
        else db.Invoices.Add(invoice);
        db.InvoiceLines.AddRange(input.Lines.Select(l => new InvoiceLine { CompanyId = u.CompanyId, InvoiceId = invoice.Id, Description = l.Description.Trim(), Quantity = l.Quantity, UnitPrice = l.UnitPrice }));
        return invoice;
    }, ct);
    public Task<object> InvoiceState(Guid id, string status, CancellationToken ct) => Write("admin", "InvoiceState", async u => {
        var invoice = await Owned(db.Invoices, id, u.CompanyId, ct);
        var allowed = status == "Issued" && invoice.Status == "Draft" || status == "Voided" && invoice.Status is "Draft" or "Issued";
        Conflict(!allowed, "This invoice transition is not allowed. Paid invoices cannot be voided.");
        if (status == "Voided") Conflict(await db.InvoicePayments.AnyAsync(x => x.CompanyId == u.CompanyId && x.InvoiceId == id, ct), "An invoice with recorded payments cannot be voided.");
        invoice.Status = status; return invoice;
    }, ct);
    public Task<object> AddPayment(Guid id, PaymentInput input, CancellationToken ct) => Write("admin", "RecordPayment", async u => {
        Money(input.Amount, true); Require(input.RequestId != Guid.Empty, "A request ID is required."); var reference = Text(input.Reference, 200);
        var previous = await db.InvoicePayments.FirstOrDefaultAsync(x => x.CompanyId == u.CompanyId && x.RequestId == input.RequestId, ct);
        if (previous != null) {
            Conflict(previous.InvoiceId != id || previous.Amount != input.Amount || previous.Date != input.Date || previous.Reference != reference, "This request ID was already used for a different payment."); return previous;
        }
        var invoice = await Owned(db.Invoices, id, u.CompanyId, ct);
        Conflict(invoice.Status is not ("Issued" or "PartPaid"), "Only issued invoices with an outstanding balance accept payments.");
        Require(input.Date >= invoice.IssueDate && input.Date <= Today, "Payment date must be between the issue date and today.");
        var paid = await db.InvoicePayments.Where(x => x.CompanyId == u.CompanyId && x.InvoiceId == id).SumAsync(x => x.Amount, ct);
        Conflict(input.Amount > invoice.Total - paid, "Payment exceeds the outstanding balance.");
        var payment = new InvoicePayment { CompanyId = u.CompanyId, InvoiceId = id, Amount = input.Amount, Date = input.Date, Reference = reference, RequestId = input.RequestId };
        db.InvoicePayments.Add(payment); invoice.Status = paid + input.Amount == invoice.Total ? "Paid" : "PartPaid"; return payment;
    }, ct);
    public async Task<object> Expenses(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("admin", ct); var q = db.Expenses.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (!string.IsNullOrEmpty(o.Status)) q = q.Where(x => x.Status == o.Status);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => (x.Description + " " + x.Category).ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderByDescending(x => x.Date).ThenBy(x => x.Id).Select(x => new { x.Id, x.Description, x.Category, x.SupplierId, x.OrderId, x.Amount, x.Date, x.PaidDate, x.Status,
            SupplierName = db.Suppliers.Where(s => s.CompanyId == u.CompanyId && s.Id == x.SupplierId).Select(s => s.Name).FirstOrDefault() }), o, ct);
    }
    public Task<object> SaveExpense(Guid? id, ExpenseInput input, CancellationToken ct) => Write("admin", "SaveExpense", async u => {
        if (input.SupplierId.HasValue) await ActiveSupplier(input.SupplierId.Value, u, ct);
        Require(input.Date != default && input.Date <= Today, "Choose an expense date no later than today.");
        var e = id.HasValue ? await Owned(db.Expenses, id.Value, u.CompanyId, ct) : new Expense { CompanyId = u.CompanyId };
        Conflict(e.Status != "Recorded" || e.OrderId.HasValue, "Only unpaid manual expenses can be edited.");
        e.Description = Text(input.Description, 500); e.Category = Text(input.Category, 80); e.SupplierId = input.SupplierId; e.Amount = Money(input.Amount, true); e.Date = input.Date;
        if (!id.HasValue) db.Expenses.Add(e); return e;
    }, ct);
    public Task<object> ExpenseState(Guid id, StateInput input, CancellationToken ct) => Write("admin", "ExpenseState", async u => {
        var e = await Owned(db.Expenses, id, u.CompanyId, ct);
        Conflict(e.Status != "Recorded" || input.Status is not ("Paid" or "Voided"), "Only recorded expenses can be marked paid or voided.");
        if (input.Status == "Paid") {
            Require(input.Date.HasValue && input.Date >= e.Date && input.Date <= Today, "Choose a payment date between the expense date and today."); e.PaidDate = input.Date;
        }
        e.Status = input.Status; return e;
    }, ct);
    public async Task<object> Report(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var u = await Caller("admin", ct); DateRange(from, to); Require(to.DayNumber - from.DayNumber <= 365, "Select at most 366 days.");
        var invoices = db.Invoices.AsNoTracking().Where(x => x.CompanyId == u.CompanyId && x.Status != "Draft" && x.Status != "Voided");
        var payments = db.InvoicePayments.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        var expenses = db.Expenses.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        var invoiced = await invoices.Where(x => x.IssueDate >= from && x.IssueDate <= to).SumAsync(x => x.Total, ct);
        var received = await payments.Where(x => x.Date >= from && x.Date <= to).SumAsync(x => x.Amount, ct);
        var spent = await expenses.Where(x => x.Status == "Paid" && x.PaidDate >= from && x.PaidDate <= to).SumAsync(x => x.Amount, ct);
        var outstanding = await invoices.SumAsync(x => x.Total, ct) - await payments.SumAsync(x => x.Amount, ct);
        var payable = await expenses.Where(x => x.Status == "Recorded").SumAsync(x => x.Amount, ct);
        return new { From = from, To = to, Currency = "INR", Invoiced = invoiced, Received = received, PaidExpenses = spent,
            NetCashFlow = received - spent, OutstandingNow = outstanding, UnpaidExpensesNow = payable };
    }
    public async Task<string> FinanceCsv(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var u = await Caller("admin", ct); DateRange(from, to); Require(to.DayNumber - from.DayNumber <= 365, "Select at most 366 days.");
        var incoming = await db.InvoicePayments.AsNoTracking().Where(x => x.CompanyId == u.CompanyId && x.Date >= from && x.Date <= to)
            .OrderBy(x => x.Date).Take(10001).Select(x => new { x.Date, Description = x.Reference, x.Amount }).ToListAsync(ct);
        var outgoing = await db.Expenses.AsNoTracking().Where(x => x.CompanyId == u.CompanyId && x.Status == "Paid" && x.PaidDate >= from && x.PaidDate <= to)
            .OrderBy(x => x.PaidDate).Take(10001).Select(x => new { Date = x.PaidDate!.Value, x.Description, x.Amount }).ToListAsync(ct);
        Require(incoming.Count + outgoing.Count <= 10000, "More than 10,000 entries match. Select a shorter range.");
        var csv = new StringBuilder("Date,Direction,Description,Amount,Currency\r\n");
        foreach (var row in incoming.Select(x => (x.Date, Direction: "In", x.Description, x.Amount))
            .Concat(outgoing.Select(x => (x.Date, Direction: "Out", x.Description, x.Amount))).OrderBy(x => x.Date))
            csv.AppendLine(string.Join(",", new[] { row.Date.ToString("yyyy-MM-dd"), row.Direction, row.Description, row.Amount.ToString(CultureInfo.InvariantCulture), "INR" }.Select(ExportAttendanceQueryHandler.Cell)));
        return csv.ToString();
    }
}
