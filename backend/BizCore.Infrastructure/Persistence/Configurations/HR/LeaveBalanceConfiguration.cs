namespace BizCore.Infrastructure.Persistence.Configurations.HR;

using BizCore.Domain.Entities.HR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class LeaveBalanceConfiguration
    : IEntityTypeConfiguration<LeaveBalance>
{
    public void Configure(
        EntityTypeBuilder<LeaveBalance> builder)
    {
        builder.ToTable("leave_balances", "hr");

        builder.HasKey(lb => lb.Id);
        builder.Property(lb => lb.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        // One balance record per employee
        // per leave type per year
        builder.HasIndex(lb => new
        {
            lb.EmployeeId,
            lb.LeaveTypeId,
            lb.Year
        })
        .IsUnique()
        .HasDatabaseName(
            "ix_leave_balance_employee_type_year");

        builder.Property(lb => lb.CreatedAt)
            .HasDefaultValueSql("NOW()");

        // Ignore computed property
        builder.Ignore(lb => lb.RemainingDays);

        builder.HasOne(lb => lb.Employee)
            .WithMany(e => e.LeaveBalances)
            .HasForeignKey(lb => lb.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(lb => lb.LeaveType)
            .WithMany(lt => lt.LeaveBalances)
            .HasForeignKey(lb => lb.LeaveTypeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}