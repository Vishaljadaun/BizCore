namespace BizCore.Infrastructure.Persistence.Configurations.HR;

using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class DepartmentConfiguration
    : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.ToTable("departments", "hr");
        // Separate "hr" schema — clean separation

        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(d => d.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(d => d.Description)
            .HasMaxLength(500);

        builder.Property(d => d.IsActive)
            .HasDefaultValue(true);

        builder.Property(d => d.CreatedAt)
            .HasDefaultValueSql("NOW()");

        // Unique: same department name not allowed
        // in same company
        builder.HasIndex(d =>
            new { d.CompanyId, d.Name })
            .IsUnique()
            .HasDatabaseName("ix_departments_company_name");

        // Manager relationship
        builder.HasOne(d => d.Manager)
            .WithMany()
            .HasForeignKey(d => d.ManagerId)
            .OnDelete(DeleteBehavior.SetNull);
        // SetNull = manager deleted → ManagerId = null
        // Department still exists

        // Employees relationship
        builder.HasMany(d => d.Employees)
            .WithOne(e => e.Department)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
        // Restrict = cannot delete department
        // if it has employees
    }
}