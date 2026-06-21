namespace BizCore.Application.HR.Employees;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Application.Users.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Get All Employees ─────────────────────────────────
public record GetEmployeesQuery(
    string? Search = null,
    Guid? DepartmentId = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<EmployeeResponse>>>;

public class GetEmployeesQueryHandler
    : IRequestHandler<GetEmployeesQuery,
        Result<PaginatedResponse<EmployeeResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetEmployeesQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PaginatedResponse<EmployeeResponse>>>
        Handle(
            GetEmployeesQuery query,
            CancellationToken cancellationToken)
    {
        var empQuery = _context.Employees
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(e => e.Department)
            .Where(e => e.CompanyId == _currentUser.CompanyId);

        // Search filter
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower().Trim();
            empQuery = empQuery.Where(e =>
                e.FirstName.ToLower().Contains(search) ||
                e.LastName.ToLower().Contains(search) ||
                e.Email.ToLower().Contains(search) ||
                e.EmployeeCode.ToLower().Contains(search));
        }

        // Department filter
        if (query.DepartmentId.HasValue)
            empQuery = empQuery.Where(e =>
                e.DepartmentId == query.DepartmentId.Value);

        // Active filter
        if (query.IsActive.HasValue)
            empQuery = empQuery.Where(e =>
                e.IsActive == query.IsActive.Value);

        var totalCount = await empQuery
            .CountAsync(cancellationToken);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        var items = await empQuery
            .OrderBy(e => e.FirstName)
            .ThenBy(e => e.LastName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeResponse(
                e.Id,
                e.EmployeeCode,
                e.FirstName,
                e.LastName,
                e.FirstName + " " + e.LastName,
                e.Email,
                e.Phone,
                e.Designation,
                e.DepartmentId,
                e.Department.Name,
                e.JoiningDate,
                e.Salary,
                e.IsActive,
                e.UserId,
                e.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result<PaginatedResponse<EmployeeResponse>>
            .Success(
                new PaginatedResponse<EmployeeResponse>(
                    items, totalCount, page, pageSize,
                    (int)Math.Ceiling(
                        (double)totalCount / pageSize)
                ));
    }
}

// ── Get Employee By Id ────────────────────────────────
public record GetEmployeeByIdQuery(Guid EmployeeId)
    : IRequest<Result<EmployeeResponse>>;

public class GetEmployeeByIdQueryHandler
    : IRequestHandler<GetEmployeeByIdQuery,
        Result<EmployeeResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetEmployeeByIdQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<EmployeeResponse>> Handle(
        GetEmployeeByIdQuery query,
        CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Include(e => e.Department)
            .FirstOrDefaultAsync(e =>
                e.Id == query.EmployeeId &&
                e.CompanyId == _currentUser.CompanyId,
                cancellationToken);

        if (employee == null)
            throw new Common.Exceptions.NotFoundException(
                "Employee", query.EmployeeId);

        return Result<EmployeeResponse>.Success(
            new EmployeeResponse(
                employee.Id,
                employee.EmployeeCode,
                employee.FirstName,
                employee.LastName,
                employee.FullName,
                employee.Email,
                employee.Phone,
                employee.Designation,
                employee.DepartmentId,
                employee.Department.Name,
                employee.JoiningDate,
                employee.Salary,
                employee.IsActive,
                employee.UserId,
                employee.CreatedAt
            ));
    }
}