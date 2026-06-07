using BizCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure.Persistence.Configurations
{
    public class AuditLogConfiguration : IEntityTypeConfiguration<AuditLog>
    {
        public void Configure(EntityTypeBuilder<AuditLog> builder)
        {
            builder.ToTable("audit_logs", "shared");

            builder.HasKey(a => a.Id);
            builder.Property(a => a.Id)
                .HasDefaultValueSql("gen_random_uuid()");

            builder.Property(a => a.Action)
                .IsRequired()
                .HasMaxLength(50);
            // CREATE, UPDATE, DELETE — short fixed values

            builder.Property(a => a.Entity)
                .IsRequired()
                .HasMaxLength(100);
            // "User", "Company", "Employee" etc.

            builder.Property(a => a.EntityId)
                .IsRequired()
                .HasMaxLength(100);

            // JSONB = PostgreSQL's binary JSON type
            // Faster than TEXT for JSON, supports querying inside JSON
            // "Show me all changes where old role was Employee"
            builder.Property(a => a.OldValues)
                .HasColumnType("jsonb");

            builder.Property(a => a.NewValues)
                .HasColumnType("jsonb");

            builder.Property(a => a.IpAddress)
                .HasMaxLength(50);

            builder.Property(a => a.CreatedAt)
                .HasDefaultValueSql("NOW()");

            // No FK to Company/User intentionally
            // Why? If company or user is deleted, we STILL want
            // to keep the audit trail. It's a historical record.
            builder.Property(a => a.CompanyId)
                .IsRequired(false);

            builder.Property(a => a.UserId)
                .IsRequired(false);

            // Indexes for common audit queries
            builder.HasIndex(a => a.CompanyId)
                .HasDatabaseName("ix_audit_logs_company_id");
            // "Show all actions in TechNova" → fast

            builder.HasIndex(a => a.CreatedAt)
                .HasDatabaseName("ix_audit_logs_created_at");
            // "Show all actions from last 7 days" → fast
        }
    }
}
