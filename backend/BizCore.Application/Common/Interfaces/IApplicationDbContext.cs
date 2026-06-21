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

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
