using BizCore.Domain.Entities.Operations;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Application.Common.Interfaces
{
    // Application layer defines WHAT it needs from the DB
    // but doesn't care HOW it's implemented
    // This is the Dependency Inversion principle
    public interface IApplicationDbContext
    {
        DbSet<WorkProject> WorkProjects { get; }
        DbSet<ProjectTask> ProjectTasks { get; }
        DbSet<TimeEntry> TimeEntries { get; }
        DbSet<Supplier> Suppliers { get; }
        DbSet<SupplierContract> SupplierContracts { get; }
        DbSet<Product> Products { get; }
        DbSet<PurchaseOrder> PurchaseOrders { get; }
        DbSet<PurchaseLine> PurchaseLines { get; }
        DbSet<StockMovement> StockMovements { get; }
        DbSet<Invoice> Invoices { get; }
        DbSet<InvoiceLine> InvoiceLines { get; }
        DbSet<InvoicePayment> InvoicePayments { get; }
        DbSet<Expense> Expenses { get; }

        DbSet<Company> Companies { get; }
        DbSet<User> Users { get; }
        DbSet<RefreshToken> RefreshTokens { get; }
        DbSet<AuditLog> AuditLogs { get; }

        // ── HR Module ─────────────────────────────────────
        DbSet<Department> Departments { get; }
        DbSet<Employee> Employees { get; }
        DbSet<LeaveType> LeaveTypes { get; }
        DbSet<LeaveBalance> LeaveBalances { get; }
        DbSet<LeaveRequest> LeaveRequests { get; }
        DbSet<Attendance> Attendances { get; }

        Task<T> WithEmployeeLockAsync<T>(Guid employeeId, Func<Task<T>> action, CancellationToken ct);

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
