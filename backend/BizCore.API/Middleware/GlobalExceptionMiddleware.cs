namespace BizCore.API.Middleware;

// Yeh using directives zaroori hain
using BizCore.Application.Common.Exceptions;
using System.Net;
using System.Text.Json;

// ─────────────────────────────────────────────────────────
// GlobalExceptionMiddleware kya karta hai?
//
// Normal flow:
// Request → Controller → Handler → Response
//
// Jab exception aata hai BINA is middleware ke:
// Request → Controller → CRASH → User ko HTML error page milta hai
// Ya "500 Internal Server Error" bina koi message ke
//
// IS middleware ke saath:
// Request → Controller → Exception → YEH MIDDLEWARE CATCH KARTA HAI
// → Clean JSON response milta hai
// → Frontend ko hamesha same error shape milti hai
// → User ko samajh aata hai kya hua
// ─────────────────────────────────────────────────────────

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    // RequestDelegate = next middleware ya controller ka reference
    // _next() call karo = pipeline aage badho

    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    // ILogger = .NET ka built-in logging system
    // Console, file, Application Insights — sab pe log ho sakta hai

    public GlobalExceptionMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    // InvokeAsync = har HTTP request pe yeh method chalta hai
    // Yahi middleware ka entry point hai
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
            // Try karo: next middleware/controller chalao
            // Koi exception nahi aya → sab normal
        }
        catch (Exception ex)
        {
            // Koi bhi unhandled exception yahan aa jaayega
            _logger.LogError(
                ex,
                "Unhandled exception. Path: {Path} | Method: {Method}",
                context.Request.Path,
                context.Request.Method);
            // Server logs mein full error save hoga
            // Client ko sirf safe message milega

            await HandleExceptionAsync(context, ex);
            // Exception ko clean JSON mein convert karo
        }
    }

    private static async Task HandleExceptionAsync(
        HttpContext context,
        Exception exception)
    {
        // Response abhi tak nahi gaya? Tabhi handle karo
        // Agar partial response ja chuka hai → kuch nahi kar sakte
        if (context.Response.HasStarted)
            return;

        context.Response.ContentType = "application/json";
        // Frontend ko batao: JSON aa raha hai

        var response = new ErrorResponse();

        // Exception type ke hisaab se status code aur message set karo
        switch (exception)
        {
            // ── Validation Error (400) ─────────────────────────
            case BizCore.Application.Common.Exceptions.ValidationException
                validationEx:
                context.Response.StatusCode = 400;
                response.StatusCode = 400;
                response.Message = "Validation failed.";
                response.Errors = validationEx.Errors;
                break;

            // ── Not Found (404) ───────────────────────────────
            case BizCore.Application.Common.Exceptions.NotFoundException
                notFoundEx:
                context.Response.StatusCode = 404;
                response.StatusCode = 404;
                response.Message = notFoundEx.Message;
                break;

            // ── Forbidden (403) ───────────────────────────────
            case BizCore.Application.Common.Exceptions.ForbiddenAccessException
                forbiddenEx:
                context.Response.StatusCode = 403;
                response.StatusCode = 403;
                response.Message = forbiddenEx.Message;
                break;

            // ── Conflict (409) ────────────────────────────────
            case BizCore.Application.Common.Exceptions.ConflictException
                conflictEx:
                context.Response.StatusCode = 409;
                response.StatusCode = 409;
                response.Message = conflictEx.Message;
                break;

            // ── Unauthorized (401) ────────────────────────────
            case UnauthorizedAccessException unauthorizedEx:
                context.Response.StatusCode = 401;
                response.StatusCode = 401;
                response.Message = unauthorizedEx.Message;
                break;

            // ── KeyNotFoundException (404) ────────────────────
            case KeyNotFoundException keyEx:
                context.Response.StatusCode = 404;
                response.StatusCode = 404;
                response.Message = keyEx.Message;
                break;

            // ── Sab kuch (500) ────────────────────────────────
            default:
                context.Response.StatusCode = 500;
                response.StatusCode = 500;
                response.Message =
                    "Server mein kuch gadbad hui. Thodi der baad try karo.";
                break;
        }

        // JSON serialize karo aur response mein write karo
        var jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            // camelCase: "statusCode", "message", "errors"
            // PascalCase nahi: "StatusCode", "Message"
            // Frontend JavaScript camelCase expect karta hai
            WriteIndented = false
            // Production mein indentation mat karo
            // Response size choti rehti hai
        };

        var jsonResponse = JsonSerializer.Serialize(
            response, jsonOptions);

        await context.Response.WriteAsync(jsonResponse);
    }
}

// ─────────────────────────────────────────────────────────
// ErrorResponse = consistent error shape
//
// Frontend hamesha yahi shape expect karega:
// {
//   "statusCode": 400,
//   "message": "Validation failed.",
//   "errors": {
//     "email": ["Email required hai."],
//     "password": ["Min 8 characters chahiye."]
//   },
//   "timestamp": "2024-11-01T10:30:00Z"
// }
// ─────────────────────────────────────────────────────────
public class ErrorResponse
{
    public int StatusCode { get; set; }
    public string Message { get; set; } = string.Empty;

    public IDictionary<string, string[]>? Errors { get; set; }
    // Nullable: sirf validation errors mein hoga
    // Other errors mein null rahega

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    // Debugging ke liye: exact time pata chale
}