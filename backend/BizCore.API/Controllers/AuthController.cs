namespace BizCore.API.Controllers;

using BizCore.Application.Auth.Commands;
using BizCore.Application.Auth.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
// [controller] = "Auth" automatically
// Route = api/auth
public class AuthController : ControllerBase
{
    private readonly ISender _mediator;
    // ISender = MediatR ka interface
    // Command/Query bhejne ke liye
    // Controller sirf request receive karta hai
    // Actual kaam MediatR handlers karte hain

    public AuthController(ISender mediator)
    {
        _mediator = mediator;
    }

    // ─────────────────────────────────────────────────
    // POST api/auth/register
    // Naya company aur admin user banao
    // ─────────────────────────────────────────────────
    [HttpPost("register")]
    [AllowAnonymous]
    // AllowAnonymous = JWT token ki zarurat nahi
    // Register karne ke liye login nahi chahiye
    public async Task<IActionResult> Register(
        [FromBody] RegisterCompanyRequest request)
    {
        var command = new RegisterCompanyCommand(
            request.CompanyName,
            request.FirstName,
            request.LastName,
            request.Email,
            request.Password
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return StatusCode(result.StatusCode,
                new { message = result.Error });

        return StatusCode(201, result.Data);
        // 201 Created = resource bana
    }

    // ─────────────────────────────────────────────────
    // POST api/auth/login
    // Email + password se login karo
    // ─────────────────────────────────────────────────
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login(
        [FromBody] Application.Auth.DTOs.LoginRequest request)
    {
        var command = new LoginCommand(
            request.Email,
            request.Password
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return StatusCode(result.StatusCode,
                new { message = result.Error });

        return Ok(result.Data);
    }

    // ─────────────────────────────────────────────────
    // POST api/auth/refresh
    // Expired access token ko renew karo
    // ─────────────────────────────────────────────────
    [HttpPost("refresh")]
    [AllowAnonymous]
    // AllowAnonymous kyun?
    // Access token expired hai isliye yahan aa rahe hain
    // Expired token se [Authorize] pass nahi hoga
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenRequest request)
    {
        var command = new RefreshTokenCommand(
            request.AccessToken,
            request.RefreshToken
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return StatusCode(result.StatusCode,
                new { message = result.Error });

        return Ok(result.Data);
    }

    // ─────────────────────────────────────────────────
    // POST api/auth/logout
    // Refresh token revoke karo
    // ─────────────────────────────────────────────────
    [HttpPost("logout")]
    [Authorize]
    // [Authorize] = valid JWT token chahiye
    public async Task<IActionResult> Logout(
        [FromBody] string refreshToken)
    {
        var command = new LogoutCommand(refreshToken);
        await _mediator.Send(command);

        return Ok(new { message = "Logout successful." });
    }

    // ─────────────────────────────────────────────────
    // GET api/auth/me
    // Current logged in user ki info
    // Token se directly read karta hai — no DB call
    // ─────────────────────────────────────────────────
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        // Claims = JWT token ke andar store data
        // Hum login ke time claims set karte hain
        // TokenService.cs mein dekho — wahan claims add kiye the
        var userId = User.FindFirst(
            System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(
            System.Security.Claims.ClaimTypes.Email)?.Value;
        var role = User.FindFirst(
            System.Security.Claims.ClaimTypes.Role)?.Value;
        var companyId = User.FindFirst("company_id")?.Value;
        var firstName = User.FindFirst("first_name")?.Value;
        var lastName = User.FindFirst("last_name")?.Value;

        return Ok(new
        {
            userId,
            email,
            role,
            companyId,
            firstName,
            lastName
        });
    }
}