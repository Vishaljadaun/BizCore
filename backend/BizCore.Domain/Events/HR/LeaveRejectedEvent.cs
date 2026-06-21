namespace BizCore.Domain.Events.HR;

using MediatR;

public record LeaveRejectedEvent(
    Guid LeaveRequestId,
    Guid EmployeeId,
    Guid CompanyId,
    string EmployeeName,
    string RejectionReason
) : INotification;