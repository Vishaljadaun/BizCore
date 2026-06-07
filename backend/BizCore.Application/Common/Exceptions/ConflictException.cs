namespace BizCore.Application.Common.Exceptions;

// ─────────────────────────────────────────────────────────
// Jab duplicate data create karne ki koshish ho
//
// Example use:
// var exists = _context.Users.Any(u => u.Email == email);
// if (exists)
//     throw new ConflictException("Email already registered hai.");
//
// GlobalExceptionMiddleware isko 409 Conflict mein convert karega
// ─────────────────────────────────────────────────────────

public class ConflictException : Exception
{
    public ConflictException(string message)
        : base(message)
    {
    }
}