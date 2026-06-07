namespace BizCore.Application.Common.Exceptions;

// ─────────────────────────────────────────────────────────
// Jab DB mein koi record na mile
//
// Example use:
// var user = await _context.Users.FindAsync(id);
// if (user == null)
//     throw new NotFoundException(nameof(User), id);
//
// GlobalExceptionMiddleware isko 404 mein convert karega
// ─────────────────────────────────────────────────────────

public class NotFoundException : Exception
{
    // Entity name aur ID se automatic message banao
    public NotFoundException(string name, object key)
        : base($"{name} with ID '{key}' nahi mila.")
    {
        // Example: "User with ID '3fa85f64...' nahi mila."
    }

    // Ya custom message
    public NotFoundException(string message)
        : base(message)
    {
    }
}