namespace BizCore.Application.Auth.DTOs;

// ── Request Shapes — Frontend se aata hai ────────────

public record RegisterCompanyRequest(
    string CompanyName,
    string FirstName,
    string LastName,
    string Email,
    string Password
);

public record LoginRequest(
    string Email,
    string Password
);

public record RefreshTokenRequest(
    string AccessToken,
    string RefreshToken
);

// ── Response Shapes — Frontend ko jaata hai ──────────

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiry,
    UserDto User
);

public record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string Role,
    Guid CompanyId,
    string CompanyName
);