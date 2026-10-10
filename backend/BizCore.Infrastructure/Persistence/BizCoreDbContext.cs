using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Common;
using BizCore.Domain.Entities;
using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure.Persistence
{
    public class BizCoreDbContext : DbContext, IApplicationDbContext
    {
        private readonly ICurrentUserService _currentUser;

        public BizCoreDbContext(
            DbContextOptions<BizCoreDbContext> options,
            ICurrentUserService currentUser) : base(options)
        {
            _currentUser = currentUser;
        }

        public DbSet<Company> Companies => Set<Company>();
        public DbSet<User> Users => Set<User>();
        public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
        public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

        // ── HR Module ─────────────────────────────────────────
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Employee> Employees => Set<Employee>();
        public DbSet<LeaveType> LeaveTypes => Set<LeaveType>();
        public DbSet<LeaveBalance> LeaveBalances => Set<LeaveBalance>();
        public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
        public DbSet<Attendance> Attendances => Set<Attendance>();

        private Guid? CurrentCompanyId => _currentUser.CompanyId;
        private bool IsSuperAdmin => _currentUser.UserRole == "SuperAdmin";

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // Scans Infrastructure assembly and applies ALL
            // IEntityTypeConfiguration classes automatically
            // No need to call each one manually
            builder.ApplyConfigurationsFromAssembly(
                typeof(BizCoreDbContext).Assembly);

            // EF caches models; context properties are evaluated per request.
            // Inactive users remain visible to tenant administration.
            builder.Entity<User>().HasQueryFilter(u => IsSuperAdmin ||
                (CurrentCompanyId.HasValue && u.CompanyId == CurrentCompanyId));

            base.OnModelCreating(builder);
        }

        public override async Task<int> SaveChangesAsync(
            CancellationToken cancellationToken = default)
        {
            // Auto-set timestamps before every save
            var entries = ChangeTracker.Entries<BaseEntity>();

            foreach (var entry in entries)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                        break;

                    case EntityState.Modified:
                        entry.Entity.UpdatedAt = DateTime.UtcNow;
                        // Don't let anyone change CreatedAt after creation
                        entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                        break;
                }
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
