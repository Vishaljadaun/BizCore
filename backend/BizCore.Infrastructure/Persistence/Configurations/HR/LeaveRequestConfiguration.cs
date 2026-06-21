namespace BizCore.Infrastructure.Persistence.Configurations.HR;

using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class LeaveRequestConfiguration
    : IEntityTypeConfiguration<LeaveRequest>
{
    public void Configure(
        EntityTypeBuilder<LeaveRequest> builder)
    {
        builder.ToTable("leave_requests", "hr");

        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id)
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(l => l.Reason)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(l => l.Status)
            .IsRequired()
            .HasConversion<int>()
            .HasDefaultValue(LeaveStatus.Pending);

        builder.Property(l => l.RejectionReason)
            .HasMaxLength(500);

        builder.Property(l => l.CreatedAt)
            .HasDefaultValueSql("NOW()");

        // Employee who applied
        builder.HasOne(l => l.Employee)
            .WithMany(e => e.LeaveRequests)
            .HasForeignKey(l => l.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Leave type
        builder.HasOne(l => l.LeaveType)
            .WithMany(lt => lt.LeaveRequests)
            .HasForeignKey(l => l.LeaveTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Who approved
        builder.HasOne(l => l.ApprovedBy)
            .WithMany()
            .HasForeignKey(l => l.ApprovedById)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(l => l.EmployeeId)
            .HasDatabaseName("ix_leave_requests_employee");

        builder.HasIndex(l => l.Status)
            .HasDatabaseName("ix_leave_requests_status");
    }
}