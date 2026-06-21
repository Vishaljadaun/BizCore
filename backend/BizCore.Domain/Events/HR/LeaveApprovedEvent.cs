namespace BizCore.Domain.Events.HR;

using MediatR;

// Domain Event — fired when leave is approved
// Multiple handlers can react to this ONE event
// This is the power of MediatR Events

public record LeaveApprovedEvent(
    Guid LeaveRequestId,
    Guid EmployeeId,
    Guid CompanyId,
    string EmployeeName,
    DateOnly StartDate,
    DateOnly EndDate,
    int TotalDays
) : INotification;
// INotification = MediatR event interface
// IRequest = command (one handler)
// INotification = event (multiple handlers)