namespace BizCore.Application.Auth.Commands;

using BizCore.Application.Auth.DTOs;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record RefreshTokenCommand(
    string AccessToken,
    string RefreshToken
) : IRequest<Result<AuthResponse>>;

// ── Handler ───────────────────────────────────────────
public class RefreshTokenCommandHandler
    : IRequestHandler<RefreshTokenCommand, Result<AuthResponse>>
{
    private readonly IApplicationDbContext _context;
    private readonly ITokenService _tokenService;

    public RefreshTokenCommandHandler(
        IApplicationDbContext context,
        ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<Result<AuthResponse>> Handle(
        RefreshTokenCommand request,
        CancellationToken cancellationToken)
    {
        // Expired token se userId nikalo
        var userId = _tokenService
            .GetUserIdFromToken(request.AccessToken);

        if (userId == null)
            return Result<AuthResponse>.Unauthorized(
                "Invalid access token.");

        // DB mein refresh token dhundo
        var storedToken = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .Include(r => r.User)
                .ThenInclude(u => u.Company)
            .FirstOrDefaultAsync(
                r => r.Token == request.RefreshToken
                    && r.UserId == userId,
                cancellationToken);

        if (storedToken == null)
            return Result<AuthResponse>.Unauthorized(
                "Invalid refresh token.");

        // Security checks
        if (storedToken.IsRevoked)
        {
            // Token reuse = possible attack!
            // Saare tokens revoke karo
            await RevokeAllUserTokens(
                userId.Value, cancellationToken);
            return Result<AuthResponse>.Unauthorized(
                "Token reuse detect hua. Dobara login karo.");
        }

        if (storedToken.IsUsed)
            return Result<AuthResponse>.Unauthorized(
                "Token already use ho chuka hai.");

        if (storedToken.ExpiresAt <= DateTime.UtcNow)
            return Result<AuthResponse>.Unauthorized(
                "Token expire ho gaya. Dobara login karo.");

        // Old token mark as used (Rotation pattern)
        storedToken.IsUsed = true;

        // Naye tokens generate karo
        var user = storedToken.User;
        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshValue = _tokenService.GenerateRefreshToken();

        var newRefreshToken = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = newRefreshValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            IsUsed = false
        };

        await _context.RefreshTokens
            .AddAsync(newRefreshToken, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<AuthResponse>.Success(
            new AuthResponse(
                AccessToken: newAccessToken,
                RefreshToken: newRefreshValue,
                AccessTokenExpiry: DateTime.UtcNow.AddMinutes(15),
                User: new UserDto(
                    Id: user.Id,
                    FirstName: user.FirstName,
                    LastName: user.LastName,
                    Email: user.Email,
                    Role: user.Role.ToString(),
                    CompanyId: user.CompanyId,
                    CompanyName: user.Company.Name
                )
            ));
    }

    private async Task RevokeAllUserTokens(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var allTokens = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .Where(r => r.UserId == userId && !r.IsRevoked)
            .ToListAsync(cancellationToken);

        foreach (var token in allTokens)
            token.IsRevoked = true;

        await _context.SaveChangesAsync(cancellationToken);
    }
}