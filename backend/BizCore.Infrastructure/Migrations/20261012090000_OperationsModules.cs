using BizCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace BizCore.Infrastructure.Migrations;
[DbContext(typeof(BizCoreDbContext))]
[Migration("20261012090000_OperationsModules")]
public class OperationsModules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
CREATE SCHEMA IF NOT EXISTS ops;
CREATE TABLE ops."WorkProject" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Name" varchar(150) NOT NULL,
  "Description" varchar(2000) NOT NULL,
  "DueDate" date,
  "Status" varchar(20) NOT NULL,
  CONSTRAINT "PK_WorkProject" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_WorkProject_CompanyId_Id" UNIQUE ("CompanyId", "Id")
);

CREATE INDEX "IX_WorkProject_CompanyId" ON ops."WorkProject" ("CompanyId");
CREATE TABLE ops."ProjectTask" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "ProjectId" uuid NOT NULL,
  "Title" varchar(200) NOT NULL,
  "Description" varchar(2000) NOT NULL,
  "AssignedUserId" uuid,
  "DueDate" date,
  "Priority" varchar(20) NOT NULL,
  "Status" varchar(20) NOT NULL,
  CONSTRAINT "PK_ProjectTask" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_ProjectTask_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_ProjectTask_WorkProject_CompanyId_ProjectId" FOREIGN KEY ("CompanyId", "ProjectId") REFERENCES ops."WorkProject" ("CompanyId", "Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_ProjectTask_CompanyId" ON ops."ProjectTask" ("CompanyId");
CREATE INDEX "IX_ProjectTask_CompanyId_ProjectId" ON ops."ProjectTask" ("CompanyId", "ProjectId");
CREATE TABLE ops."TimeEntry" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "TaskId" uuid NOT NULL,
  "UserId" uuid NOT NULL,
  "Date" date NOT NULL,
  "Minutes" integer NOT NULL,
  "Note" varchar(1000) NOT NULL,
  CONSTRAINT "PK_TimeEntry" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_TimeEntry_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_TimeEntry_ProjectTask_CompanyId_TaskId" FOREIGN KEY ("CompanyId", "TaskId") REFERENCES ops."ProjectTask" ("CompanyId", "Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_TimeEntry_CompanyId" ON ops."TimeEntry" ("CompanyId");
CREATE INDEX "IX_TimeEntry_CompanyId_TaskId" ON ops."TimeEntry" ("CompanyId", "TaskId");
CREATE TABLE ops."Supplier" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Name" varchar(150) NOT NULL,
  "Email" varchar(256) NOT NULL,
  "Phone" varchar(40) NOT NULL,
  "Address" varchar(1000) NOT NULL,
  "PortalUserId" uuid,
  "IsActive" boolean NOT NULL,
  CONSTRAINT "PK_Supplier" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_Supplier_CompanyId_Id" UNIQUE ("CompanyId", "Id")
);
CREATE UNIQUE INDEX "IX_Supplier_CompanyId_PortalUserId" ON ops."Supplier" ("CompanyId", "PortalUserId");
CREATE INDEX "IX_Supplier_CompanyId" ON ops."Supplier" ("CompanyId");
CREATE TABLE ops."SupplierContract" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "SupplierId" uuid NOT NULL,
  "Title" varchar(200) NOT NULL,
  "Terms" varchar(4000) NOT NULL,
  "StartDate" date NOT NULL,
  "EndDate" date NOT NULL,
  "Value" numeric(18,2) NOT NULL,
  "Status" varchar(20) NOT NULL,
  CONSTRAINT "PK_SupplierContract" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_SupplierContract_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_SupplierContract_Supplier_CompanyId_SupplierId" FOREIGN KEY ("CompanyId", "SupplierId") REFERENCES ops."Supplier" ("CompanyId", "Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_SupplierContract_CompanyId" ON ops."SupplierContract" ("CompanyId");
CREATE INDEX "IX_SupplierContract_CompanyId_SupplierId" ON ops."SupplierContract" ("CompanyId", "SupplierId");
CREATE TABLE ops."Product" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Sku" varchar(50) NOT NULL,
  "Name" varchar(150) NOT NULL,
  "Unit" varchar(30) NOT NULL,
  "ReorderLevel" integer NOT NULL,
  "OnHand" integer NOT NULL,
  "UnitCost" numeric(18,2) NOT NULL,
  "IsActive" boolean NOT NULL,
  CONSTRAINT "PK_Product" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_Product_CompanyId_Id" UNIQUE ("CompanyId", "Id")
);
CREATE UNIQUE INDEX "IX_Product_CompanyId_Sku" ON ops."Product" ("CompanyId", "Sku");
CREATE INDEX "IX_Product_CompanyId" ON ops."Product" ("CompanyId");
CREATE TABLE ops."PurchaseOrder" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Number" varchar(30) NOT NULL,
  "SupplierId" uuid NOT NULL,
  "ExpectedDate" date,
  "Notes" varchar(1000) NOT NULL,
  "Status" varchar(20) NOT NULL,
  "Total" numeric(18,2) NOT NULL,
  CONSTRAINT "PK_PurchaseOrder" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_PurchaseOrder_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_PurchaseOrder_Supplier_CompanyId_SupplierId" FOREIGN KEY ("CompanyId", "SupplierId") REFERENCES ops."Supplier" ("CompanyId", "Id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "IX_PurchaseOrder_CompanyId_Number" ON ops."PurchaseOrder" ("CompanyId", "Number");
CREATE INDEX "IX_PurchaseOrder_CompanyId" ON ops."PurchaseOrder" ("CompanyId");
CREATE INDEX "IX_PurchaseOrder_CompanyId_SupplierId" ON ops."PurchaseOrder" ("CompanyId", "SupplierId");
CREATE TABLE ops."PurchaseLine" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "OrderId" uuid NOT NULL,
  "ProductId" uuid NOT NULL,
  "Quantity" integer NOT NULL,
  "UnitCost" numeric(18,2) NOT NULL,
  CONSTRAINT "PK_PurchaseLine" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_PurchaseLine_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_PurchaseLine_PurchaseOrder_CompanyId_OrderId" FOREIGN KEY ("CompanyId", "OrderId") REFERENCES ops."PurchaseOrder" ("CompanyId", "Id") ON DELETE RESTRICT,
  CONSTRAINT "FK_PurchaseLine_Product_CompanyId_ProductId" FOREIGN KEY ("CompanyId", "ProductId") REFERENCES ops."Product" ("CompanyId", "Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_PurchaseLine_CompanyId" ON ops."PurchaseLine" ("CompanyId");
CREATE INDEX "IX_PurchaseLine_CompanyId_OrderId" ON ops."PurchaseLine" ("CompanyId", "OrderId");
CREATE INDEX "IX_PurchaseLine_CompanyId_ProductId" ON ops."PurchaseLine" ("CompanyId", "ProductId");
CREATE TABLE ops."StockMovement" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "ProductId" uuid NOT NULL,
  "OrderId" uuid,
  "UserId" uuid NOT NULL,
  "Delta" integer NOT NULL,
  "BalanceAfter" integer NOT NULL,
  "Reason" varchar(500) NOT NULL,
  "RequestId" uuid NOT NULL,
  CONSTRAINT "PK_StockMovement" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_StockMovement_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_StockMovement_Product_CompanyId_ProductId" FOREIGN KEY ("CompanyId", "ProductId") REFERENCES ops."Product" ("CompanyId", "Id") ON DELETE RESTRICT,
  CONSTRAINT "FK_StockMovement_PurchaseOrder_CompanyId_OrderId" FOREIGN KEY ("CompanyId", "OrderId") REFERENCES ops."PurchaseOrder" ("CompanyId", "Id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "IX_StockMovement_CompanyId_RequestId" ON ops."StockMovement" ("CompanyId", "RequestId");
CREATE INDEX "IX_StockMovement_CompanyId" ON ops."StockMovement" ("CompanyId");
CREATE INDEX "IX_StockMovement_CompanyId_ProductId" ON ops."StockMovement" ("CompanyId", "ProductId");
CREATE INDEX "IX_StockMovement_CompanyId_OrderId" ON ops."StockMovement" ("CompanyId", "OrderId");
CREATE TABLE ops."Invoice" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Number" varchar(30) NOT NULL,
  "CustomerName" varchar(150) NOT NULL,
  "CustomerEmail" varchar(256) NOT NULL,
  "IssueDate" date NOT NULL,
  "DueDate" date NOT NULL,
  "Notes" varchar(1000) NOT NULL,
  "Status" varchar(20) NOT NULL,
  "TaxPercent" numeric(5,2) NOT NULL,
  "Subtotal" numeric(18,2) NOT NULL,
  "Total" numeric(18,2) NOT NULL,
  CONSTRAINT "PK_Invoice" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_Invoice_CompanyId_Id" UNIQUE ("CompanyId", "Id")
);
CREATE UNIQUE INDEX "IX_Invoice_CompanyId_Number" ON ops."Invoice" ("CompanyId", "Number");
CREATE INDEX "IX_Invoice_CompanyId" ON ops."Invoice" ("CompanyId");
CREATE TABLE ops."InvoiceLine" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "InvoiceId" uuid NOT NULL,
  "Description" varchar(300) NOT NULL,
  "Quantity" numeric(12,2) NOT NULL,
  "UnitPrice" numeric(18,2) NOT NULL,
  CONSTRAINT "PK_InvoiceLine" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_InvoiceLine_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_InvoiceLine_Invoice_CompanyId_InvoiceId" FOREIGN KEY ("CompanyId", "InvoiceId") REFERENCES ops."Invoice" ("CompanyId", "Id") ON DELETE RESTRICT
);

CREATE INDEX "IX_InvoiceLine_CompanyId" ON ops."InvoiceLine" ("CompanyId");
CREATE INDEX "IX_InvoiceLine_CompanyId_InvoiceId" ON ops."InvoiceLine" ("CompanyId", "InvoiceId");
CREATE TABLE ops."InvoicePayment" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "InvoiceId" uuid NOT NULL,
  "Amount" numeric(18,2) NOT NULL,
  "Date" date NOT NULL,
  "Reference" varchar(200) NOT NULL,
  "RequestId" uuid NOT NULL,
  CONSTRAINT "PK_InvoicePayment" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_InvoicePayment_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_InvoicePayment_Invoice_CompanyId_InvoiceId" FOREIGN KEY ("CompanyId", "InvoiceId") REFERENCES ops."Invoice" ("CompanyId", "Id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "IX_InvoicePayment_CompanyId_RequestId" ON ops."InvoicePayment" ("CompanyId", "RequestId");
CREATE INDEX "IX_InvoicePayment_CompanyId" ON ops."InvoicePayment" ("CompanyId");
CREATE INDEX "IX_InvoicePayment_CompanyId_InvoiceId" ON ops."InvoicePayment" ("CompanyId", "InvoiceId");
CREATE TABLE ops."Expense" (
  "Id" uuid NOT NULL,
  "CompanyId" uuid NOT NULL,
  "CreatedAt" timestamp with time zone NOT NULL,
  "UpdatedAt" timestamp with time zone,
  "Description" varchar(500) NOT NULL,
  "Category" varchar(80) NOT NULL,
  "SupplierId" uuid,
  "OrderId" uuid,
  "Amount" numeric(18,2) NOT NULL,
  "Date" date NOT NULL,
  "PaidDate" date,
  "Status" varchar(20) NOT NULL,
  CONSTRAINT "PK_Expense" PRIMARY KEY ("Id"),
  CONSTRAINT "AK_Expense_CompanyId_Id" UNIQUE ("CompanyId", "Id"),
  CONSTRAINT "FK_Expense_Supplier_CompanyId_SupplierId" FOREIGN KEY ("CompanyId", "SupplierId") REFERENCES ops."Supplier" ("CompanyId", "Id") ON DELETE RESTRICT,
  CONSTRAINT "FK_Expense_PurchaseOrder_CompanyId_OrderId" FOREIGN KEY ("CompanyId", "OrderId") REFERENCES ops."PurchaseOrder" ("CompanyId", "Id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "IX_Expense_CompanyId_OrderId" ON ops."Expense" ("CompanyId", "OrderId");
CREATE INDEX "IX_Expense_CompanyId" ON ops."Expense" ("CompanyId");
CREATE INDEX "IX_Expense_CompanyId_SupplierId" ON ops."Expense" ("CompanyId", "SupplierId");
ALTER TABLE ops."Product" ADD CONSTRAINT "CK_Product_Values" CHECK ("OnHand" >= 0 AND "ReorderLevel" >= 0 AND "UnitCost" >= 0);
ALTER TABLE ops."TimeEntry" ADD CONSTRAINT "CK_TimeEntry_Values" CHECK ("Minutes" > 0 AND "Minutes" <= 1440);
ALTER TABLE ops."PurchaseLine" ADD CONSTRAINT "CK_PurchaseLine_Values" CHECK ("Quantity" > 0 AND "UnitCost" >= 0);
ALTER TABLE ops."InvoiceLine" ADD CONSTRAINT "CK_InvoiceLine_Values" CHECK ("Quantity" > 0 AND "UnitPrice" >= 0);
ALTER TABLE ops."InvoicePayment" ADD CONSTRAINT "CK_InvoicePayment_Values" CHECK ("Amount" > 0);
ALTER TABLE ops."Expense" ADD CONSTRAINT "CK_Expense_Values" CHECK ("Amount" > 0);
ALTER TABLE ops."StockMovement" ADD CONSTRAINT "CK_StockMovement_Values" CHECK ("Delta" <> 0 AND "BalanceAfter" >= 0);
ALTER TABLE ops."Invoice" ADD CONSTRAINT "CK_Invoice_Values" CHECK ("Total" >= 0 AND "TaxPercent" >= 0 AND "TaxPercent" <= 100);
""");
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable("Expense", "ops");
        migrationBuilder.DropTable("InvoicePayment", "ops");
        migrationBuilder.DropTable("InvoiceLine", "ops");
        migrationBuilder.DropTable("Invoice", "ops");
        migrationBuilder.DropTable("StockMovement", "ops");
        migrationBuilder.DropTable("PurchaseLine", "ops");
        migrationBuilder.DropTable("PurchaseOrder", "ops");
        migrationBuilder.DropTable("Product", "ops");
        migrationBuilder.DropTable("SupplierContract", "ops");
        migrationBuilder.DropTable("Supplier", "ops");
        migrationBuilder.DropTable("TimeEntry", "ops");
        migrationBuilder.DropTable("ProjectTask", "ops");
        migrationBuilder.DropTable("WorkProject", "ops");
    }
}
