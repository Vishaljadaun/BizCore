namespace BizCore.API.Controllers;

using BizCore.Application.HR.Departments;
using BizCore.Application.HR.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hr/[controller]")]
[Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
public class DepartmentsController : ControllerBase
{
    private readonly ISender _mediator;

    public DepartmentsController(ISender mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetDepartments(
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetDepartmentsQuery(search, page, pageSize));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> CreateDepartment(
        [FromBody] CreateDepartmentRequest request)
    {
        var result = await _mediator.Send(
            new CreateDepartmentCommand(
                request.Name,
                request.Description));
        return result.IsSuccess
            ? StatusCode(201, result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> UpdateDepartment(
        Guid id,
        [FromBody] UpdateDepartmentRequest request)
    {
        var result = await _mediator.Send(
            new UpdateDepartmentCommand(
                id,
                request.Name,
                request.Description,
                request.ManagerId));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }
}