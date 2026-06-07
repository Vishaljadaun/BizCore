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
    public class UserConfiguration : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("users", "shared");

            builder.HasKey(u => u.Id);
            builder.Property(u => u.Id)
                .HasDefaultValueSql("gen_random_uuid()");

            // ── Name fields ────────────────────────────────────
            builder.Property(u => u.FirstName)
                .IsRequired()
                .HasMaxLength(100);

            builder.Property(u => u.LastName)
                .IsRequired()
                .HasMaxLength(100);

            // ── Email — unique per company ─────────────────────
            builder.Property(u => u.Email)
                .IsRequired()
                .HasMaxLength(255);

            // Composite unique index: same email can exist in different
            // companies but NOT twice in the same company
            // TechNova can have john@gmail.com
            // AnotherCo can ALSO have john@gmail.com → Allowed ✅
            // TechNova having john@gmail.com TWICE → Not allowed ❌
            builder.HasIndex(u => new { u.Email, u.CompanyId })
                .IsUnique()
                .HasDatabaseName("ix_users_email_company");

            // ── Security ───────────────────────────────────────
            builder.Property(u => u.PasswordHash)
                .IsRequired()
                .HasMaxLength(500);
            // BCrypt hashes are ~60 chars but we give extra room

            // ── Role stored as integer in DB ───────────────────
            builder.Property(u => u.Role)
                .IsRequired()
                .HasConversion<int>();
            // HasConversion<int>() = store enum as number in DB
            // SuperAdmin=1, CompanyAdmin=2 etc. in DB
            // EF Core auto-converts to/from enum in C#

            builder.Property(u => u.IsActive)
                .HasDefaultValue(true);

            builder.Property(u => u.LastLogin)
                .IsRequired(false);

            builder.Property(u => u.CreatedAt)
                .HasDefaultValueSql("NOW()");

            builder.Property(u => u.UpdatedAt)
                .IsRequired(false);

            // ── Ignore computed property ───────────────────────
            builder.Ignore(u => u.FullName);
            // FullName is calculated in C# (FirstName + LastName)
            // We tell EF: don't try to create a DB column for this

            // ── Tenant FK ──────────────────────────────────────
            builder.HasOne(u => u.Company)
                .WithMany(c => c.Users)
                .HasForeignKey(u => u.CompanyId)
                .OnDelete(DeleteBehavior.Restrict);

            // ── Refresh tokens relationship ─────────────────────
            builder.HasMany(u => u.RefreshTokens)
                .WithOne(r => r.User)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            // Cascade = when user is deleted, all their tokens
            // are also deleted automatically. Makes sense here.

            // ── Performance index ──────────────────────────────
            builder.HasIndex(u => u.CompanyId)
                .HasDatabaseName("ix_users_company_id");
            // Without this index: "get all users of company X"
            // = full table scan across ALL companies' users
            // With this index: instant lookup. Critical for multi-tenancy.
        }
    }
}
