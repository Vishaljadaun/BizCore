namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;

public class LeaveBalance : BaseTenantEntity
{
    public Guid EmployeeId { get; set; }
    public Guid LeaveTypeId { get; set; }
    public int Year { get; set; }
    public int TotalDays { get; set; }
    public int UsedDays { get; set; }

    // Computed — no DB column
    public int RemainingDays => TotalDays - UsedDays;

    // Navigation
    public Employee Employee { get; set; } = null!;
    public LeaveType LeaveType { get; set; } = null!;
}