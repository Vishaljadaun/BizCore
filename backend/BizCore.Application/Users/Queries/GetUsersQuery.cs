namespace BizCore.Application.Users.Queries;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetUsersQuery(
    string? Search = null,
    string? Role = null,
    bool? IsActive = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<UserResponse>>>;

public class GetUsersQueryHandler
    : IRequestHandler<GetUsersQuery,
        Result<PaginatedResponse<UserResponse>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;

    public GetUsersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUser)
    {
        _context = context;
        _currentUser = currentUser;
    }

    public async Task<Result<PaginatedResponse<UserResponse>>> Handle(
        GetUsersQuery query,
        CancellationToken cancellationToken)
    {
        // ── Base Query ─────────────────────────────────
        // ALWAYS use IgnoreQueryFilters + manual CompanyId filter
        // Why? More explicit and safer than relying on global filter
        // Global filter depends on HttpContext — can be null in some cases

        var companyId = _currentUser.CompanyId;

        if (companyId == null)
            return Result<PaginatedResponse<UserResponse>>
                .Failure("Company context not found.", 403);

        // Start with explicit tenant isolation
        var usersQuery = _context.Users
            .IgnoreQueryFilters()
            // Bypass global filter — we handle it manually below
            .AsNoTracking()
            .Where(u => u.CompanyId == companyId.Value);
        // ↑ ALWAYS filter by company first
        // This is the most important line for multi-tenancy

        // ── SuperAdmin Exception ───────────────────────
        // If current user is NOT SuperAdmin:
        // → Exclude SuperAdmin users from results
        // → CompanyAdmin should NEVER see SuperAdmin
        var currentUserRole = _currentUser.UserRole;

        if (currentUserRole != UserRole.SuperAdmin.ToString())
        {
            usersQuery = usersQuery
                .Where(u => u.Role != UserRole.SuperAdmin);
            // Even if somehow a SuperAdmin is in the same
            // company — hide them from non-SuperAdmin users
        }

        // ── Search Filter ──────────────────────────────
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower().Trim();
            usersQuery = usersQuery.Where(u =>
                u.FirstName.ToLower().Contains(search) ||
                u.LastName.ToLower().Contains(search) ||
                u.Email.ToLower().Contains(search));
        }

        // ── Role Filter ────────────────────────────────
        if (!string.IsNullOrWhiteSpace(query.Role) &&
            Enum.TryParse<UserRole>(query.Role, out var roleEnum))
        {
            // Prevent filtering for SuperAdmin role
            // Extra security layer
            if (roleEnum != UserRole.SuperAdmin ||
                currentUserRole == UserRole.SuperAdmin.ToString())
            {
                usersQuery = usersQuery
                    .Where(u => u.Role == roleEnum);
            }
        }

        // ── Active Status Filter ───────────────────────
        if (query.IsActive.HasValue)
        {
            usersQuery = usersQuery
                .Where(u => u.IsActive == query.IsActive.Value);
            // No IgnoreQueryFilters needed here anymore
            // We already bypassed global filter above
        }

        // ── Count Before Pagination ────────────────────
        var totalCount = await usersQuery
            .CountAsync(cancellationToken);

        // ── Pagination ─────────────────────────────────
        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        var items = await usersQuery
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserResponse(
                u.Id,
                u.FirstName,
                u.LastName,
                u.FirstName + " " + u.LastName,
                u.Email,
                u.Role.ToString(),
                u.IsActive,
                u.CompanyId,
                u.CreatedAt,
                u.LastLogin,
                u.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(
            (double)totalCount / pageSize);

        return Result<PaginatedResponse<UserResponse>>.Success(
            new PaginatedResponse<UserResponse>(
                Items: items,
                TotalCount: totalCount,
                Page: page,
                PageSize: pageSize,
                TotalPages: totalPages
            ));
    }
}