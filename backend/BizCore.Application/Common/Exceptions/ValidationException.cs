namespace BizCore.Application.Common.Exceptions;

// Yeh using directive zaroori hai
// FluentValidation.Results.ValidationFailure class yahan se aati hai
using FluentValidation.Results;

// ─────────────────────────────────────────────────────────
// ValidationException kya karta hai?
//
// Normal .NET Exception:
// throw new Exception("Something went wrong");
// → Sirf ek message, koi field info nahi
//
// Hamara ValidationException:
// → Multiple fields ke multiple errors ek saath
// → Frontend ko pata chalta hai EXACTLY konsi field galat hai
//
// Example:
// {
//   "email": ["Email required hai", "Valid format nahi"],
//   "password": ["Min 8 chars chahiye", "Capital letter chahiye"]
// }
// ─────────────────────────────────────────────────────────

public class ValidationException : Exception
{
    // Dictionary kyun?
    // Key = field name ("email", "password", "companyName")
    // Value = us field ke saare errors ka array
    // string[] kyun array? Ek field ke multiple errors ho sakte hain
    public IDictionary<string, string[]> Errors { get; }

    // Constructor — FluentValidation ke failures leta hai
    public ValidationException(
        IEnumerable<ValidationFailure> failures)
        : base("One or more validation failures have occurred.")
    // base() = parent Exception class ka constructor call karo
    // Message property set hoti hai
    {
        Errors = failures
            .GroupBy(
                f => f.PropertyName,
                // Group by field name
                // "email" ke saare errors ek group mein
                // "password" ke saare errors alag group mein

                f => f.ErrorMessage
                // Har group mein sirf error messages rakho
                // (PropertyName aur AttemptedValue nahi chahiye)
            )
            .ToDictionary(
                group => group.Key,
                // Key = field name: "email", "password"

                group => group.ToArray()
                // Value = errors array: ["Required", "Invalid format"]
            );
    }

    // Second constructor — manually errors pass karo
    // Testing ya custom validation mein useful
    public ValidationException(
        IDictionary<string, string[]> errors)
        : base("One or more validation failures have occurred.")
    {
        Errors = errors;
    }

    // Third constructor — single error message
    // Simple cases ke liye
    public ValidationException(string field, string message)
        : base("One or more validation failures have occurred.")
    {
        Errors = new Dictionary<string, string[]>
        {
            { field, new[] { message } }
        };
    }
}