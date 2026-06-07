namespace BizCore.Application.Common.Exceptions;

// ─────────────────────────────────────────────────────────
// Jab user logged in hai lekin
// us resource ka access nahi hai
//
// 401 Unauthorized = "Kon hai tu? Login kar"
// 403 Forbidden    = "Login hai tu, lekin yeh nahi kar sakta"
//
// Example use:
// if (project.CompanyId != currentUser.CompanyId)
//     throw new ForbiddenAccessException();
// ─────────────────────────────────────────────────────────

public class ForbiddenAccessException : Exception
{
    public ForbiddenAccessException()
        : base("Is resource ka access nahi hai aapko.")
    {
    }

    public ForbiddenAccessException(string message)
        : base(message)
    {
    }
}