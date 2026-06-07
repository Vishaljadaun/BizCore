namespace BizCore.API.Controllers;

using BizCore.Application.Users.Commands;
using BizCore.Application.Users.DTOs;
using BizCore.Application.Users.Queries;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize]
// All endpoints require login by default
// Individual endpoints override this with [AllowAnonymous] if needed
public class UsersController : ControllerBase
{
    private readonly ISender _mediator;

    public UsersController(ISender mediator)
    {
        _mediator = mediator;
    }

    // ──────────────────────────────────────────────────
    // GET api/users
    // GET api/users?search=rajesh&role=Manager&page=1&pageSize=10
    // ──────────────────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> GetUsers( 
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        // [FromQuery] = reads from URL query string
        // GET /api/users?search=john&page=2
        var query = new GetUsersQuery(
            search, role, isActive, page, pageSize);
        var result = await _mediator.Send(query);

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ──────────────────────────────────────────────────
    // GET api/users/{id}
    // ──────────────────────────────────────────────────
    [HttpGet("{id:guid}")]
    // {id:guid} = route constraint
    // Only matches if id is a valid GUID format
    // Invalid GUID → 404 automatically (no need to validate)
    [Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> GetUser(Guid id)
    {
        var query = new GetUserByIdQuery(id);
        var result = await _mediator.Send(query);

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ──────────────────────────────────────────────────
    // POST api/users
    // ──────────────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> CreateUser(
        [FromBody] CreateUserRequest request)
    {
        var command = new CreateUserCommand(
            request.FirstName,
            request.LastName,
            request.Email,
            request.Password,
            request.Role
        );
        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return StatusCode(result.StatusCode,
                new { message = result.Error });

        // 201 Created + Location header pointing to new resource
        return CreatedAtAction(
            nameof(GetUser),
            new { id = result.Data!.Id },
            result.Data);
        // CreatedAtAction generates:
        // Status: 201
        // Header: Location: /api/users/{newUserId}
        // Body: the created user object
    }

    // ──────────────────────────────────────────────────
    // PUT api/users/{id}
    // ──────────────────────────────────────────────────
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserRequest request)
    {
        var command = new UpdateUserCommand(
            id,
            request.FirstName,
            request.LastName,
            request.Email
        );
        var result = await _mediator.Send(command);

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ──────────────────────────────────────────────────
    // PUT api/users/{id}/role
    // ──────────────────────────────────────────────────
    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> ChangeRole(
        Guid id,
        [FromBody] ChangeRoleRequest request)
    {
        var command = new ChangeRoleCommand(id, request.Role);
        var result = await _mediator.Send(command);

        return result.IsSuccess
            ? Ok(new { message = "Role updated successfully." })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ──────────────────────────────────────────────────
    // PUT api/users/{id}/toggle
    // ──────────────────────────────────────────────────
    [HttpPut("{id:guid}/toggle")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var command = new ToggleUserStatusCommand(id);
        var result = await _mediator.Send(command);

        return result.IsSuccess
            ? Ok(new
            {
                isActive = result.Data,
                message = result.Data
                    ? "User activated successfully."
                    : "User deactivated successfully."
            })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ──────────────────────────────────────────────────
    // DELETE api/users/{id}
    // ──────────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var command = new DeleteUserCommand(id);
        var result = await _mediator.Send(command);

        return result.IsSuccess
            ? Ok(new { message = "User deleted successfully." })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }
}