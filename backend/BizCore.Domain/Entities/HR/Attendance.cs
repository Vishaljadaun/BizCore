namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;
using BizCore.Domain.Enums;

public class Attendance : BaseTenantEntity
{
    public Guid EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public DateTime ClockIn { get; set; }
    public DateTime? ClockOut { get; set; }

    // Calculated when clocking out
    public decimal? WorkingHours { get; set; }

    public AttendanceStatus Status { get; set; }
        = AttendanceStatus.Present;

    public string? Notes { get; set; }

    // Navigation
    public Employee Employee { get; set; } = null!;
}