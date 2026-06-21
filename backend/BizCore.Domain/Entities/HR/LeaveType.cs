namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;

public class LeaveType : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    // "Casual Leave", "Sick Leave", "Annual Leave"

    public int DaysAllowed { get; set; }
    // How many days per year allowed

    public bool IsActive { get; set; } = true;

    public ICollection<LeaveBalance> LeaveBalances { get; set; }
        = new List<LeaveBalance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; }
        = new List<LeaveRequest>();
}