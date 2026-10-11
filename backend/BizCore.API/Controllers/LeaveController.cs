using BizCore.Application.HR.Leaves;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BizCore.API.Controllers;

[ApiController, Route("api/hr/leave"), Authorize]
public class LeaveController(ISender mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] Guid? employeeId, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetLeaveRequestsQuery(employeeId, status, page, pageSize), ct);
        return result.IsSuccess ? Ok(result.Data) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    [HttpGet("types")]
    public async Task<IActionResult> Types(CancellationToken ct)
    {
        var result = await mediator.Send(new GetLeaveTypesQuery(), ct);
        return result.IsSuccess ? Ok(result.Data) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    [HttpPost("types"), Authorize(Roles = "CompanyAdmin,SuperAdmin")]
    public async Task<IActionResult> CreateType(CreateLeaveTypeCommand command, CancellationToken ct)
    {
        var result = await mediator.Send(command, ct);
        return result.IsSuccess ? StatusCode(201, result.Data) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    [HttpPut("{id:guid}/approve"), Authorize(Roles = "CompanyAdmin,SuperAdmin,Manager")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new DecideLeaveCommand(id, true), ct);
        return result.IsSuccess ? Ok(new { message = "Leave approved." }) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    [HttpPut("{id:guid}/reject"), Authorize(Roles = "CompanyAdmin,SuperAdmin,Manager")]
    public async Task<IActionResult> Reject(Guid id, RejectBody body, CancellationToken ct)
    {
        var result = await mediator.Send(new DecideLeaveCommand(id, false, body.RejectionReason), ct);
        return result.IsSuccess ? Ok(new { message = "Leave rejected." }) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    [HttpPut("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new CancelLeaveCommand(id), ct);
        return result.IsSuccess ? Ok(new { message = "Request cancelled." }) : StatusCode(result.StatusCode, new { message = result.Error });
    }
    public record RejectBody(string RejectionReason);
}
