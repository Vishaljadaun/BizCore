namespace BizCore.Infrastructure.Persistence.Configurations.HR;

using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class EmployeeConfiguration
    : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("employees", "hr");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(e => e.EmployeeCode)
            .IsRequired()
            .HasMaxLength(20);

        // Unique employee code per company
        builder.HasIndex(e =>
            new { e.CompanyId, e.EmployeeCode })
            .IsUnique()
            .HasDatabaseName("ix_employees_code_company");

        builder.Property(e => e.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Email)
            .IsRequired()
            .HasMaxLength(255);

        builder.HasIndex(e =>
            new { e.CompanyId, e.Email })
            .IsUnique()
            .HasDatabaseName("ix_employees_email_company");

        builder.Property(e => e.Phone)
            .HasMaxLength(20);

        builder.Property(e => e.Designation)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(e => e.Salary)
            .HasColumnType("decimal(18,2)");

        builder.Property(e => e.IsActive)
            .HasDefaultValue(true);

        builder.Property(e => e.CreatedAt)
            .HasDefaultValueSql("NOW()");

        // Ignore computed property
        builder.Ignore(e => e.FullName);

        // Department relationship
        builder.HasOne(e => e.Department)
            .WithMany(d => d.Employees)
            .HasForeignKey(e => e.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // User relationship (optional)
        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Performance indexes
        builder.HasIndex(e => e.CompanyId)
            .HasDatabaseName("ix_employees_company_id");

        builder.HasIndex(e => e.DepartmentId)
            .HasDatabaseName("ix_employees_department_id");
    }
}