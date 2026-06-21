namespace BizCore.Infrastructure.Persistence.Configurations.HR;

using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class LeaveTypeConfiguration
    : IEntityTypeConfiguration<LeaveType>
{
    public void Configure(EntityTypeBuilder<LeaveType> builder)
    {
        builder.ToTable("leave_types", "hr");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(l => l.Name)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(l =>
            new { l.CompanyId, l.Name })
            .IsUnique()
            .HasDatabaseName("ix_leave_types_company_name");

        builder.Property(l => l.IsActive)
            .HasDefaultValue(true);

        builder.Property(l => l.CreatedAt)
            .HasDefaultValueSql("NOW()");

        builder.HasMany(l => l.LeaveBalances)
            .WithOne(lb => lb.LeaveType)
            .HasForeignKey(lb => lb.LeaveTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}