namespace BizCore.Application.HR.Departments;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.DTOs;
using BizCore.Application.Users.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Get All Departments ───────────────────────────────
public record GetDepartmentsQuery(
    string? Search = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<DepartmentResponse>>>;

public class GetDepartmentsQueryHandler
    : IRequestHandler<GetDepartmentsQuery,
        Result<PaginatedResponse<DepartmentResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetDepartmentsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PaginatedResponse<DepartmentResponse>>>
        Handle(
            GetDepartmentsQuery query,
            CancellationToken cancellationToken)
    {
        var deptQuery = _context.Departments
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(d => d.CompanyId == _currentUser.CompanyId);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower().Trim();
            deptQuery = deptQuery
                .Where(d => d.Name.ToLower().Contains(search));
        }

        var totalCount = await deptQuery
            .CountAsync(cancellationToken);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        var items = await deptQuery
            .OrderBy(d => d.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new DepartmentResponse(
                d.Id,
                d.Name,
                d.Description,
                d.ManagerId,
                d.Manager != null
                    ? d.Manager.FirstName + " " + d.Manager.LastName
                    : null,
                // Count employees in this department
                _context.Employees
                    .IgnoreQueryFilters()
                    .Count(e => e.DepartmentId == d.Id
                        && e.IsActive),
                d.IsActive,
                d.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result<PaginatedResponse<DepartmentResponse>>
            .Success(
                new PaginatedResponse<DepartmentResponse>(
                    items,
                    totalCount,
                    page,
                    pageSize,
                    (int)Math.Ceiling(
                        (double)totalCount / pageSize)
                ));
    }
}

// ── Update Department ─────────────────────────────────
public record UpdateDepartmentCommand(
    Guid DepartmentId,
    string Name,
    string? Description,
    Guid? ManagerId
) : IRequest<Result<DepartmentResponse>>;

public class UpdateDepartmentCommandHandler
    : IRequestHandler<UpdateDepartmentCommand,
        Result<DepartmentResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public UpdateDepartmentCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<DepartmentResponse>> Handle(
        UpdateDepartmentCommand command,
        CancellationToken cancellationToken)
    {
        var dept = await _context.Departments
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(d =>
                d.Id == command.DepartmentId &&
                d.CompanyId == _currentUser.CompanyId,
                cancellationToken);

        if (dept == null)
            throw new Common.Exceptions.NotFoundException(
                "Department", command.DepartmentId);

        dept.Name = command.Name.Trim();
        dept.Description = command.Description?.Trim();
        dept.ManagerId = command.ManagerId;

        await _context.SaveChangesAsync(cancellationToken);

        return Result<DepartmentResponse>.Success(
            new DepartmentResponse(
                dept.Id, dept.Name, dept.Description,
                dept.ManagerId, null, 0,
                dept.IsActive, dept.CreatedAt
            ));
    }
}