namespace BizCore.Application.HR.DTOs;

// ── Department DTOs ───────────────────────────────────
public record DepartmentResponse(
    Guid Id,
    string Name,
    string? Description,
    Guid? ManagerId,
    string? ManagerName,
    int TotalEmployees,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateDepartmentRequest(
    string Name,
    string? Description
);

public record UpdateDepartmentRequest(
    string Name,
    string? Description,
    Guid? ManagerId
);

// ── Employee DTOs ─────────────────────────────────────
public record EmployeeResponse(
    Guid Id,
    string EmployeeCode,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string? Phone,
    string Designation,
    Guid DepartmentId,
    string DepartmentName,
    DateOnly JoiningDate,
    decimal Salary,
    bool IsActive,
    Guid? UserId,
    DateTime CreatedAt
);

public record CreateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string Designation,
    Guid DepartmentId,
    DateOnly JoiningDate,
    decimal Salary,
    Guid? UserId
);

public record UpdateEmployeeRequest(
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string Designation,
    Guid DepartmentId,
    decimal Salary
);

// ── Leave Type DTOs ───────────────────────────────────
public record LeaveTypeResponse(
    Guid Id,
    string Name,
    int DaysAllowed,
    bool IsActive
);

// ── Leave Balance DTOs ────────────────────────────────
public record LeaveBalanceResponse(
    Guid LeaveTypeId,
    string LeaveTypeName,
    int TotalDays,
    int UsedDays,
    int RemainingDays,
    int Year
);

// ── Leave Request DTOs ────────────────────────────────
public record LeaveRequestResponse(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    string LeaveTypeName,
    DateOnly StartDate,
    DateOnly EndDate,
    int TotalDays,
    string Reason,
    string Status,
    string? ApprovedByName,
    DateTime? ApprovedAt,
    string? RejectionReason,
    DateTime CreatedAt
);

public record ApplyLeaveRequest(
    Guid LeaveTypeId,
    DateOnly StartDate,
    DateOnly EndDate,
    string Reason
);

public record ApproveLeaveRequest(
    Guid ApproverEmployeeId
);

public record RejectLeaveRequest(
    Guid ApproverEmployeeId,
    string RejectionReason
);

// ── Attendance DTOs ───────────────────────────────────
public record AttendanceResponse(
    Guid Id,
    Guid EmployeeId,
    string EmployeeName,
    DateOnly Date,
    DateTime ClockIn,
    DateTime? ClockOut,
    decimal? WorkingHours,
    string Status,
    string? Notes
);

public record ClockInRequest(
    Guid? EmployeeId
);

public record ClockOutRequest(
    Guid? EmployeeId
);