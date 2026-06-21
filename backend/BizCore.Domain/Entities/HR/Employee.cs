namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;

public class Employee : BaseTenantEntity
{
    // Optional link to system user
    // Employee can exist without system access
    public Guid? UserId { get; set; }

    public Guid DepartmentId { get; set; }

    // Unique code per company: EMP001, EMP002
    public string EmployeeCode { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Designation { get; set; } = string.Empty;
    public DateOnly JoiningDate { get; set; }
    public decimal Salary { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Department Department { get; set; }
        = null!;
    public User? User { get; set; }
    public ICollection<LeaveRequest> LeaveRequests { get; set; }
        = new List<LeaveRequest>();
    public ICollection<Attendance> Attendances { get; set; }
        = new List<Attendance>();
    public ICollection<LeaveBalance> LeaveBalances { get; set; }
        = new List<LeaveBalance>();

    // Computed
    public string FullName => $"{FirstName} {LastName}";
}