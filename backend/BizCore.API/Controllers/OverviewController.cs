using System.Text;
using BizCore.Application.HR.Overview;
using BizCore.Application.HR.Attendance;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace BizCore.API.Controllers;
[ApiController, Route("api/hr"), Authorize]
public class OverviewController(ISender mediator) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<IActionResult> Overview(CancellationToken ct) => Ok(await mediator.Send(new GetOverviewQuery(), ct));
    [HttpGet("attendance/export"), Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> Export([FromQuery] DateOnly from, [FromQuery] DateOnly to,
        [FromQuery] Guid? employeeId, CancellationToken ct)
    {
        var result = await mediator.Send(new ExportAttendanceQuery(from, to, employeeId), ct);
        if (!result.IsSuccess) return StatusCode(result.StatusCode, new { message = result.Error });
        return File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(result.Data!)).ToArray(),
            "text/csv; charset=utf-8", $"attendance-{from:yyyy-MM-dd}-{to:yyyy-MM-dd}.csv");
    }
}
