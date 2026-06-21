namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetLeaveRequestsQuery(
    Guid? EmployeeId = null,
    string? Status = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<LeaveRequestResponse>>>;

public class GetLeaveRequestsQueryHandler
    : IRequestHandler<GetLeaveRequestsQuery,
        Result<PaginatedResponse<LeaveRequestResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetLeaveRequestsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PaginatedResponse<LeaveRequestResponse>>>
        Handle(
            GetLeaveRequestsQuery query,
            CancellationToken cancellationToken)
    {
        var leaveQuery = _context.LeaveRequests
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(lr => lr.Employee)
            .Include(lr => lr.LeaveType)
            .Include(lr => lr.ApprovedBy)
            .Where(lr => lr.CompanyId == _currentUser.CompanyId);

        // Filter by employee
        if (query.EmployeeId.HasValue)
            leaveQuery = leaveQuery.Where(lr =>
                lr.EmployeeId == query.EmployeeId.Value);

        // Filter by status
        if (!string.IsNullOrWhiteSpace(query.Status) &&
            Enum.TryParse<LeaveStatus>(
                query.Status, out var statusEnum))
        {
            leaveQuery = leaveQuery.Where(lr =>
                lr.Status == statusEnum);
        }

        var totalCount = await leaveQuery
            .CountAsync(cancellationToken);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        var items = await leaveQuery
            .OrderByDescending(lr => lr.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(lr => new LeaveRequestResponse(
                lr.Id,
                lr.EmployeeId,
                lr.Employee.FirstName + " " + lr.Employee.LastName,
                lr.LeaveType.Name,
                lr.StartDate,
                lr.EndDate,
                lr.TotalDays,
                lr.Reason,
                lr.Status.ToString(),
                lr.ApprovedBy != null
                    ? lr.ApprovedBy.FirstName + " " +
                      lr.ApprovedBy.LastName
                    : null,
                lr.ApprovedAt,
                lr.RejectionReason,
                lr.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result<PaginatedResponse<LeaveRequestResponse>>
            .Success(
                new PaginatedResponse<LeaveRequestResponse>(
                    items, totalCount, page, pageSize,
                    (int)Math.Ceiling(
                        (double)totalCount / pageSize)
                ));
    }
}