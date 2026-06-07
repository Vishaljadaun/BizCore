namespace BizCore.Application.Users.DTOs;

using BizCore.Domain.Enums;

// ── Response DTO ──────────────────────────────────────
// What we send BACK to the frontend
public record UserResponse(
    Guid Id,
    string FirstName,
    string LastName,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    Guid CompanyId,
    DateTime CreatedAt,
    DateTime? LastLogin,
    DateTime? UpdatedAt
);

// ── Paginated List Response ───────────────────────────
// Wraps list results with pagination metadata
public record PaginatedResponse<T>(
    IEnumerable<T> Items,
    // The actual data items

    int TotalCount,
    // Total records in DB (before pagination)

    int Page,
    // Current page number (1-based)

    int PageSize,
    // How many items per page

    int TotalPages
// Math.Ceiling(TotalCount / PageSize)
);

// ── Create User Request ───────────────────────────────
public record CreateUserRequest(
    string FirstName,
    string LastName,
    string Email,
    string Password,
    UserRole Role
);

// ── Update User Request ───────────────────────────────
public record UpdateUserRequest(
    string FirstName,
    string LastName,
    string Email
);

// ── Change Role Request ───────────────────────────────
public record ChangeRoleRequest(
    UserRole Role
);