namespace BizCore.Application.Auth.Commands;

using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

// ── Command ───────────────────────────────────────────
public record LogoutCommand(
    string RefreshToken
) : IRequest<Result>;

// ── Handler ───────────────────────────────────────────
public class LogoutCommandHandler
    : IRequestHandler<LogoutCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public LogoutCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(
        LogoutCommand request,
        CancellationToken cancellationToken)
    {
        var token = await _context.RefreshTokens
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                r => r.Token == request.RefreshToken,
                cancellationToken);

        // Token nahi mila toh bhi success
        // User ko logout karna hai — token valid ho ya na ho
        if (token == null)
            return Result.Success();

        token.IsRevoked = true;
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}