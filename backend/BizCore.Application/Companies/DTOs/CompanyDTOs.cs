namespace BizCore.Application.Companies.DTOs;

// ── Response ──────────────────────────────────────────
public record CompanyResponse(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string Subscription,
    bool IsActive,
    int TotalUsers,
    int ActiveUsers,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

// ── Platform Stats (SuperAdmin Dashboard) ─────────────
public record PlatformStatsResponse(
    int TotalCompanies,
    int ActiveCompanies,
    int TrialCompanies,
    int TotalUsers,
    int ActiveUsers
);

// ── Requests ──────────────────────────────────────────
public record CreateCompanyRequest(
    string Name,
    string AdminFirstName,
    string AdminLastName,
    string AdminEmail,
    string AdminPassword,
    string Subscription
);

public record UpdateCompanyRequest(
    string Name,
    string Subscription
);