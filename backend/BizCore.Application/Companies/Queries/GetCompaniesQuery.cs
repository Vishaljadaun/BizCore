namespace BizCore.Application.Companies.Queries;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.Companies.DTOs;
using BizCore.Application.Users.DTOs;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Get All Companies ─────────────────────────────────
public record GetCompaniesQuery(
    string? Search = null,
    string? Status = null,
    // "active", "inactive", "trial" etc.
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<CompanyResponse>>>;

public class GetCompaniesQueryHandler
    : IRequestHandler<GetCompaniesQuery,
        Result<PaginatedResponse<CompanyResponse>>>
{
    private readonly IApplicationDbContext _context;

    public GetCompaniesQueryHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PaginatedResponse<CompanyResponse>>>
        Handle(
            GetCompaniesQuery query,
            CancellationToken cancellationToken)
    {
        // IgnoreQueryFilters = SuperAdmin sab companies dekhe
        // Global filter company_id restrict karta hai
        var companiesQuery = _context.Companies
            .IgnoreQueryFilters()
            .AsNoTracking()
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.ToLower().Trim();
            companiesQuery = companiesQuery
                .Where(c =>
                    c.Name.ToLower().Contains(search) ||
                    c.Slug.ToLower().Contains(search));
        }

        // Status filter
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            companiesQuery = query.Status.ToLower() switch
            {
                "active" => companiesQuery
                    .Where(c => c.IsActive),
                "inactive" => companiesQuery
                    .Where(c => !c.IsActive),
                "trial" => companiesQuery
                    .Where(c => c.Subscription == "trial"),
                "pro" => companiesQuery
                    .Where(c => c.Subscription == "pro"),
                _ => companiesQuery
            };
        }

        var totalCount = await companiesQuery
            .CountAsync(cancellationToken);

        var pageSize = Math.Clamp(query.PageSize, 1, 100);
        var page = Math.Max(1, query.Page);

        // Get companies with user counts
        var items = await companiesQuery
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CompanyResponse(
                c.Id,
                c.Name,
                c.Slug,
                c.LogoUrl,
                c.Subscription,
                c.IsActive,
                // Count total users for this company
                _context.Users
                    .IgnoreQueryFilters()
                    .Count(u => u.CompanyId == c.Id),
                // Count active users
                _context.Users
                    .IgnoreQueryFilters()
                    .Count(u => u.CompanyId == c.Id
                        && u.IsActive),
                c.CreatedAt,
                c.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        var totalPages = (int)Math.Ceiling(
            (double)totalCount / pageSize);

        return Result<PaginatedResponse<CompanyResponse>>
            .Success(
                new PaginatedResponse<CompanyResponse>(
                    Items: items,
                    TotalCount: totalCount,
                    Page: page,
                    PageSize: pageSize,
                    TotalPages: totalPages
                ));
    }
}

// ── Get Single Company ────────────────────────────────
public record GetCompanyByIdQuery(Guid CompanyId)
    : IRequest<Result<CompanyResponse>>;

public class GetCompanyByIdQueryHandler
    : IRequestHandler<GetCompanyByIdQuery,
        Result<CompanyResponse>>
{
    private readonly IApplicationDbContext _context;

    public GetCompanyByIdQueryHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<CompanyResponse>> Handle(
        GetCompanyByIdQuery query,
        CancellationToken cancellationToken)
    {
        var company = await _context.Companies
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(
                c => c.Id == query.CompanyId,
                cancellationToken);

        if (company == null)
            throw new Common.Exceptions.NotFoundException(
                nameof(Company), query.CompanyId);

        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(
                u => u.CompanyId == company.Id,
                cancellationToken);

        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(
                u => u.CompanyId == company.Id
                    && u.IsActive,
                cancellationToken);

        return Result<CompanyResponse>.Success(
            new CompanyResponse(
                company.Id,
                company.Name,
                company.Slug,
                company.LogoUrl,
                company.Subscription,
                company.IsActive,
                totalUsers,
                activeUsers,
                company.CreatedAt,
                company.UpdatedAt
            ));
    }
}

// ── Get Platform Stats ────────────────────────────────
public record GetPlatformStatsQuery()
    : IRequest<Result<PlatformStatsResponse>>;

public class GetPlatformStatsQueryHandler
    : IRequestHandler<GetPlatformStatsQuery,
        Result<PlatformStatsResponse>>
{
    private readonly IApplicationDbContext _context;

    public GetPlatformStatsQueryHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PlatformStatsResponse>> Handle(
        GetPlatformStatsQuery query,
        CancellationToken cancellationToken)
    {
        // All stats ignore tenant filter
        var totalCompanies = await _context.Companies
            .IgnoreQueryFilters()
            .CountAsync(cancellationToken);

        var activeCompanies = await _context.Companies
            .IgnoreQueryFilters()
            .CountAsync(c => c.IsActive, cancellationToken);

        var trialCompanies = await _context.Companies
            .IgnoreQueryFilters()
            .CountAsync(
                c => c.Subscription == "trial",
                cancellationToken);

        var totalUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(cancellationToken);

        var activeUsers = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.IsActive, cancellationToken);

        return Result<PlatformStatsResponse>.Success(
            new PlatformStatsResponse(
                TotalCompanies: totalCompanies,
                ActiveCompanies: activeCompanies,
                TrialCompanies: trialCompanies,
                TotalUsers: totalUsers,
                ActiveUsers: activeUsers
            ));
    }
}

// ── Get Company Users ─────────────────────────────────
public record GetCompanyUsersQuery(
    Guid CompanyId,
    int Page = 1,
    int PageSize = 10
) : IRequest<Result<PaginatedResponse<UserResponse>>>;

public class GetCompanyUsersQueryHandler
    : IRequestHandler<GetCompanyUsersQuery,
        Result<PaginatedResponse<UserResponse>>>
{
    private readonly IApplicationDbContext _context;

    public GetCompanyUsersQueryHandler(
        IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PaginatedResponse<UserResponse>>>
        Handle(
            GetCompanyUsersQuery query,
            CancellationToken cancellationToken)
    {
        var usersQuery = _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.CompanyId == query.CompanyId);

        var totalCount = await usersQuery
            .CountAsync(cancellationToken);

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

        return Result<PaginatedResponse<UserResponse>>
            .Success(
                new PaginatedResponse<UserResponse>(
                    Items: items,
                    TotalCount: totalCount,
                    Page: page,
                    PageSize: pageSize,
                    TotalPages: (int)Math.Ceiling(
                        (double)totalCount / pageSize)
                ));
    }
}