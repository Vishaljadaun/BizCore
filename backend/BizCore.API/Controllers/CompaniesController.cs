namespace BizCore.API.Controllers;

using BizCore.Application.Companies.Commands;
using BizCore.Application.Companies.DTOs;
using BizCore.Application.Companies.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "SuperAdmin")]
// ALL endpoints SuperAdmin only
// CompanyAdmin cannot access any of these
public class CompaniesController : ControllerBase
{
    private readonly ISender _mediator;

    public CompaniesController(ISender mediator)
    {
        _mediator = mediator;
    }

    // ── GET api/companies/stats ────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetPlatformStats()
    {
        var result = await _mediator
            .Send(new GetPlatformStatsQuery());

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/companies ──────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetCompanies(
        [FromQuery] string? search = null,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetCompaniesQuery(
                search, status, page, pageSize));

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/companies/{id} ─────────────────────────
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCompany(Guid id)
    {
        var result = await _mediator
            .Send(new GetCompanyByIdQuery(id));

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/companies/{id}/users ───────────────────
    [HttpGet("{id:guid}/users")]
    public async Task<IActionResult> GetCompanyUsers(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetCompanyUsersQuery(id, page, pageSize));

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/companies ─────────────────────────────
    [HttpPost]
    public async Task<IActionResult> CreateCompany(
        [FromBody] CreateCompanyRequest request)
    {
        var command = new CreateCompanyCommand(
            request.Name,
            request.AdminFirstName,
            request.AdminLastName,
            request.AdminEmail,
            request.AdminPassword,
            request.Subscription
        );

        var result = await _mediator.Send(command);

        if (!result.IsSuccess)
            return StatusCode(result.StatusCode,
                new { message = result.Error });

        return CreatedAtAction(
            nameof(GetCompany),
            new { id = result.Data!.Id },
            result.Data);
    }

    // ── PUT api/companies/{id} ─────────────────────────
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCompany(
        Guid id,
        [FromBody] UpdateCompanyRequest request)
    {
        var command = new UpdateCompanyCommand(
            id,
            request.Name,
            request.Subscription
        );

        var result = await _mediator.Send(command);

        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── PUT api/companies/{id}/toggle ──────────────────
    [HttpPut("{id:guid}/toggle")]
    public async Task<IActionResult> ToggleCompany(Guid id)
    {
        var result = await _mediator
            .Send(new ToggleCompanyCommand(id));

        return result.IsSuccess
            ? Ok(new
            {
                isActive = result.Data,
                message = result.Data
                    ? "Company activated successfully."
                    : "Company deactivated successfully."
            })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }
}