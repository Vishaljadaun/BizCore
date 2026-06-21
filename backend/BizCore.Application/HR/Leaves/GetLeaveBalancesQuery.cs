namespace BizCore.Application.HR.Leaves;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetLeaveBalancesQuery(
    Guid EmployeeId,
    int? Year = null
) : IRequest<Result<List<LeaveBalanceResponse>>>;

public class GetLeaveBalancesQueryHandler
    : IRequestHandler<GetLeaveBalancesQuery,
        Result<List<LeaveBalanceResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetLeaveBalancesQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<List<LeaveBalanceResponse>>>
        Handle(
            GetLeaveBalancesQuery query,
            CancellationToken cancellationToken)
    {
        var year = query.Year ?? DateTime.UtcNow.Year;

        var balances = await _context.LeaveBalances
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(lb => lb.LeaveType)
            .Where(lb =>
                lb.EmployeeId == query.EmployeeId &&
                lb.CompanyId == _currentUser.CompanyId &&
                lb.Year == year)
            .Select(lb => new LeaveBalanceResponse(
                lb.LeaveTypeId,
                lb.LeaveType.Name,
                lb.TotalDays,
                lb.UsedDays,
                lb.TotalDays - lb.UsedDays,
                // RemainingDays computed here
                lb.Year
            ))
            .ToListAsync(cancellationToken);

        return Result<List<LeaveBalanceResponse>>
            .Success(balances);
    }
}