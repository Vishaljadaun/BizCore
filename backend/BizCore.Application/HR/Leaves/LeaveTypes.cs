namespace BizCore.Application.HR.Leaves;
using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.Access;
using BizCore.Application.HR.DTOs;
using BizCore.Domain.Entities.HR;
using BizCore.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record GetLeaveTypesQuery : IRequest<Result<List<LeaveTypeResponse>>>;
public class GetLeaveTypesQueryHandler(IApplicationDbContext db, ICurrentUserService current) : IRequestHandler<GetLeaveTypesQuery, Result<List<LeaveTypeResponse>>>
{
    public async Task<Result<List<LeaveTypeResponse>>> Handle(GetLeaveTypesQuery query, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        return Result<List<LeaveTypeResponse>>.Success(await db.LeaveTypes.AsNoTracking().Where(x => x.CompanyId == caller.CompanyId && x.IsActive)
            .OrderBy(x => x.Name).Select(x => new LeaveTypeResponse(x.Id, x.Name, x.DaysAllowed, x.IsActive)).ToListAsync(ct));
    }
}
public record CreateLeaveTypeCommand(string Name, int DaysAllowed) : IRequest<Result<LeaveTypeResponse>>;
public class CreateLeaveTypeCommandHandler(IApplicationDbContext db, ICurrentUserService current) : IRequestHandler<CreateLeaveTypeCommand, Result<LeaveTypeResponse>>
{
    public async Task<Result<LeaveTypeResponse>> Handle(CreateLeaveTypeCommand command, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        if (caller.Role is not (UserRole.CompanyAdmin or UserRole.SuperAdmin)) throw new ForbiddenAccessException("Only company administrators can configure leave types.");
        if (string.IsNullOrWhiteSpace(command.Name) || command.Name.Trim().Length > 50 || command.DaysAllowed is < 1 or > 366)
            return Result<LeaveTypeResponse>.Failure("Enter a name (up to 50 characters) and 1–366 annual days.");
        // Company-wide lock serializes policy creation, including case-insensitive duplicates.
        return await db.WithEmployeeLockAsync(caller.CompanyId, async () => {
            var name = command.Name.Trim();
            if (await db.LeaveTypes.AnyAsync(x => x.CompanyId == caller.CompanyId && x.Name.ToLower() == name.ToLower(), ct))
                return Result<LeaveTypeResponse>.Failure("A leave type with that name already exists.", 409);
            var type = new LeaveType { Id = Guid.NewGuid(), CompanyId = caller.CompanyId, Name = name, DaysAllowed = command.DaysAllowed };
            db.LeaveTypes.Add(type);
            await db.SaveChangesAsync(ct);
            return Result<LeaveTypeResponse>.Success(new(type.Id, type.Name, type.DaysAllowed, true), 201);
        }, ct);
    }
}
