namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;
using BizCore.Domain.Enums;

public class LeaveRequest : BaseTenantEntity
{
    public Guid EmployeeId { get; set; }
    public Guid LeaveTypeId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int TotalDays { get; set; }
    public string Reason { get; set; }
        = string.Empty;
    public LeaveStatus Status { get; set; }
        = LeaveStatus.Pending;

    // Who approved/rejected
    public Guid? ApprovedById { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? RejectionReason { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; } = null!;
    public Employee? ApprovedBy { get; set; }
}