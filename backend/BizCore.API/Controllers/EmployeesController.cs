namespace BizCore.API.Controllers;

using BizCore.Application.HR.Attendance;
using BizCore.Application.HR.DTOs;
using BizCore.Application.HR.Employees;
using BizCore.Application.HR.Leaves;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/hr/[controller]")]
[Authorize]
public class EmployeesController : ControllerBase
{
    private readonly ISender _mediator;

    public EmployeesController(ISender mediator)
    {
        _mediator = mediator;
    }

    // ── GET api/hr/employees ──────────────────────────
    [HttpGet]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> GetEmployees(
        [FromQuery] string? search = null,
        [FromQuery] Guid? departmentId = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetEmployeesQuery(
                search, departmentId, isActive,
                page, pageSize));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/{id} ─────────────────────
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> GetEmployee(Guid id)
    {
        var result = await _mediator
            .Send(new GetEmployeeByIdQuery(id));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/me ───────────────────────
    // Current logged-in user's own employee profile
    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var result = await _mediator
            .Send(new GetMyEmployeeProfileQuery());
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees ─────────────────────────
    [HttpPost]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> CreateEmployee(
        [FromBody] CreateEmployeeRequest request)
    {
        var result = await _mediator.Send(
            new CreateEmployeeCommand(
                request.FirstName,
                request.LastName,
                request.Email,
                request.Phone,
                request.Designation,
                request.DepartmentId,
                request.JoiningDate,
                request.Salary,
                request.UserId));
        return result.IsSuccess
            ? StatusCode(201, result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/{id}/link-user ──────────
    [HttpPost("{id:guid}/link-user")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> LinkUser(
        Guid id,
        [FromBody] LinkUserRequest request)
    {
        var result = await _mediator.Send(
            new LinkEmployeeToUserCommand(id, request.UserId));
        return result.IsSuccess
            ? Ok(new { message = "Login access granted." })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── DELETE api/hr/employees/{id}/link-user ────────
    [HttpDelete("{id:guid}/link-user")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin")]
    public async Task<IActionResult> UnlinkUser(Guid id)
    {
        var result = await _mediator
            .Send(new UnlinkEmployeeFromUserCommand(id));
        return result.IsSuccess
            ? Ok(new { message = "Login access revoked." })
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/{id}/leave-balances ──────
    [HttpGet("{id:guid}/leave-balances")]
    public async Task<IActionResult> GetLeaveBalances(
        Guid id,
        [FromQuery] int? year = null)
    {
        var result = await _mediator
            .Send(new GetLeaveBalancesQuery(id, year));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/{id}/leave-requests ──────
    [HttpGet("{id:guid}/leave-requests")]
    public async Task<IActionResult> GetLeaveRequests(
        Guid id,
        [FromQuery] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetLeaveRequestsQuery(
                id, status, page, pageSize));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/{id}/apply-leave ────────
    [HttpPost("{id:guid}/apply-leave")]
    public async Task<IActionResult> ApplyLeave(
        Guid id,
        [FromBody] ApplyLeaveRequest request)
    {
        var result = await _mediator.Send(
            new ApplyLeaveCommand(
                id,
                request.LeaveTypeId,
                request.StartDate,
                request.EndDate,
                request.Reason));
        return result.IsSuccess
            ? StatusCode(201, result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/{id}/attendance ──────────
    [HttpGet("{id:guid}/attendance")]
    public async Task<IActionResult> GetAttendance(
        Guid id,
        [FromQuery] DateOnly? date = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetAttendanceQuery(
                id, date, page, pageSize));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── GET api/hr/employees/attendance ───────────────
    // Generic attendance list (no specific employee in route)
    // Used by Attendance page with optional filters
    [HttpGet("attendance")]
    [Authorize(Roles = "SuperAdmin,CompanyAdmin,Manager")]
    public async Task<IActionResult> GetAllAttendance(
        [FromQuery] Guid? employeeId = null,
        [FromQuery] DateOnly? date = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(
            new GetAttendanceQuery(
                employeeId, date, page, pageSize));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/{id}/clock-in ───────────
    // {id} can be the employee's own ID (self clock-in)
    // or another employee's ID (manager clocking someone in)
    [HttpPost("{id:guid}/clock-in")]
    public async Task<IActionResult> ClockIn(Guid id)
    {
        var result = await _mediator
            .Send(new ClockInCommand(id));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/{id}/clock-out ──────────
    [HttpPost("{id:guid}/clock-out")]
    public async Task<IActionResult> ClockOut(Guid id)
    {
        var result = await _mediator
            .Send(new ClockOutCommand(id));
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/clock-in ────────────────
    // Self clock-in — no employee ID needed in route
    // Reads employee_id from current user's JWT token
    [HttpPost("clock-in")]
    public async Task<IActionResult> SelfClockIn()
    {
        var result = await _mediator
            .Send(new ClockInCommand());
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }

    // ── POST api/hr/employees/clock-out ───────────────
    [HttpPost("clock-out")]
    public async Task<IActionResult> SelfClockOut()
    {
        var result = await _mediator
            .Send(new ClockOutCommand());
        return result.IsSuccess
            ? Ok(result.Data)
            : StatusCode(result.StatusCode,
                new { message = result.Error });
    }
}

// ── Request DTO for Link User ─────────────────────────
public record LinkUserRequest(Guid UserId);