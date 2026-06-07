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
    // IEntityTypeConfiguration<T> = one focused class per entity
    // Much cleaner than putting all config inside DbContext
    public class CompanyConfiguration : IEntityTypeConfiguration<Company>
    {
        public void Configure(EntityTypeBuilder<Company> builder)
        {
            // ── Table location ─────────────────────────────────
            builder.ToTable("companies", "shared");
            // Why "shared" schema? Later we'll have:
            // hr.employees, projects.tasks, inv.products
            // "shared" holds entities used across ALL modules

            // ── Primary Key ────────────────────────────────────
            builder.HasKey(c => c.Id);
            builder.Property(c => c.Id)
                .HasDefaultValueSql("gen_random_uuid()");
            // Why gen_random_uuid()? PostgreSQL generates the UUID
            // at DB level — even if you insert without setting Id

            // ── Required columns with max lengths ──────────────
            builder.Property(c => c.Name)
                .IsRequired()
                .HasMaxLength(200);
            // Why max length? Prevents someone entering a 10,000
            // character company name. DB enforces this as VARCHAR(200)

            builder.Property(c => c.Slug)
                .IsRequired()
                .HasMaxLength(200);

            // ── Unique constraint on Slug ──────────────────────
            builder.HasIndex(c => c.Slug)
                .IsUnique();
            // Why? Two companies can't have slug "technova-solutions"
            // Also makes slug-based lookups extremely fast (index)

            builder.Property(c => c.Subscription)
                .IsRequired()
                .HasMaxLength(50)
                .HasDefaultValue("trial");
            // HasDefaultValue = DB-level default
            // Even raw SQL inserts get "trial" automatically

            builder.Property(c => c.LogoUrl)
                .HasMaxLength(500);
            // Optional — no IsRequired()

            builder.Property(c => c.IsActive)
                .HasDefaultValue(true);

            // ── Timestamps ─────────────────────────────────────
            builder.Property(c => c.CreatedAt)
                .HasDefaultValueSql("NOW()");
            // NOW() = PostgreSQL function for current timestamp
            // Set automatically when row is inserted

            builder.Property(c => c.UpdatedAt)
                .IsRequired(false);
            // Nullable — null means never updated

            // ── Relationships ──────────────────────────────────
            builder.HasMany(c => c.Users)
                .WithOne(u => u.Company)
                .HasForeignKey(u => u.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);
            // Restrict = you CANNOT delete a company that has users
            // Protects against accidental data deletion
            // You'd need to deactivate all users first
        }
    }
}
