using BizCore.Domain.Common;
namespace BizCore.Domain.Entities.Operations;

public class WorkProject : BaseTenantEntity
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public DateOnly? DueDate { get; set; }
    public string Status { get; set; } = "Active";
}

public class ProjectTask : BaseTenantEntity
{
    public Guid ProjectId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public Guid? AssignedUserId { get; set; }
    public DateOnly? DueDate { get; set; }
    public string Priority { get; set; } = "Medium";
    public string Status { get; set; } = "Todo";
}

public class TimeEntry : BaseTenantEntity
{
    public Guid TaskId { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public int Minutes { get; set; }
    public string Note { get; set; } = "";
}

public class Supplier : BaseTenantEntity
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Address { get; set; } = "";
    public Guid? PortalUserId { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SupplierContract : BaseTenantEntity
{
    public Guid SupplierId { get; set; }
    public string Title { get; set; } = "";
    public string Terms { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Value { get; set; }
    public string Status { get; set; } = "Draft";
}

public class Product : BaseTenantEntity
{
    public string Sku { get; set; } = "";
    public string Name { get; set; } = "";
    public string Unit { get; set; } = "units";
    public int ReorderLevel { get; set; }
    public int OnHand { get; set; }
    public decimal UnitCost { get; set; }
    public bool IsActive { get; set; } = true;
}

public class PurchaseOrder : BaseTenantEntity
{
    public string Number { get; set; } = "";
    public Guid SupplierId { get; set; }
    public DateOnly? ExpectedDate { get; set; }
    public string Notes { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public decimal Total { get; set; }
}

public class PurchaseLine : BaseTenantEntity
{
    public Guid OrderId { get; set; }
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitCost { get; set; }
}

public class StockMovement : BaseTenantEntity
{
    public Guid ProductId { get; set; }
    public Guid? OrderId { get; set; }
    public Guid UserId { get; set; }
    public int Delta { get; set; }
    public int BalanceAfter { get; set; }
    public string Reason { get; set; } = "";
    public Guid RequestId { get; set; }
}

public class Invoice : BaseTenantEntity
{
    public string Number { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string CustomerEmail { get; set; } = "";
    public DateOnly IssueDate { get; set; }
    public DateOnly DueDate { get; set; }
    public string Notes { get; set; } = "";
    public string Status { get; set; } = "Draft";
    public decimal TaxPercent { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Total { get; set; }
}

public class InvoiceLine : BaseTenantEntity
{
    public Guid InvoiceId { get; set; }
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}

public class InvoicePayment : BaseTenantEntity
{
    public Guid InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public string Reference { get; set; } = "";
    public Guid RequestId { get; set; }
}

public class Expense : BaseTenantEntity
{
    public string Description { get; set; } = "";
    public string Category { get; set; } = "";
    public Guid? SupplierId { get; set; }
    public Guid? OrderId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly Date { get; set; }
    public DateOnly? PaidDate { get; set; }
    public string Status { get; set; } = "Recorded";
}

