namespace BizCore.Application.HR.Attendance;
using System.Globalization;
using System.Text;
using BizCore.Application.Common.Exceptions;
using BizCore.Application.Common.Interfaces;
using BizCore.Application.Common.Models;
using BizCore.Application.HR.Access;
using MediatR;
using Microsoft.EntityFrameworkCore;

public record ExportAttendanceQuery(DateOnly From, DateOnly To, Guid? EmployeeId) : IRequest<Result<string>>;
public class ExportAttendanceQueryHandler(IApplicationDbContext db, ICurrentUserService current) : IRequestHandler<ExportAttendanceQuery, Result<string>>
{
    public async Task<Result<string>> Handle(ExportAttendanceQuery query, CancellationToken ct)
    {
        var caller = await EmployeeAccess.GetCallerAsync(db, current, ct);
        if (!EmployeeAccess.CanManage(caller)) throw new ForbiddenAccessException("Only administrators and managers can export attendance.");
        if (query.From == default || query.To < query.From || query.To.DayNumber - query.From.DayNumber > 365)
            return Result<string>.Failure("Choose a date range of at most 366 days.");
        if (query.EmployeeId.HasValue) await EmployeeAccess.RequireAsync(db, caller, query.EmployeeId, ct);
        var rows = db.Attendances.AsNoTracking().Include(x => x.Employee).Where(x => x.CompanyId == caller.CompanyId && x.Date >= query.From && x.Date <= query.To);
        if (query.EmployeeId.HasValue) rows = rows.Where(x => x.EmployeeId == query.EmployeeId);
        var items = await rows.OrderBy(x => x.Date).ThenBy(x => x.EmployeeId).Take(10001).ToListAsync(ct);
        if (items.Count > 10000) return Result<string>.Failure("More than 10,000 records match. Choose a smaller date range.");
        var csv = new StringBuilder("Employee code,Employee name,Date (UTC),Clock in (UTC),Clock out (UTC),Hours,Status\r\n");
        foreach (var row in items)
            csv.AppendLine(string.Join(",", new[] { row.Employee.EmployeeCode, row.Employee.FullName,
                row.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), row.ClockIn.ToString("O"),
                row.ClockOut?.ToString("O") ?? "", row.WorkingHours?.ToString(CultureInfo.InvariantCulture) ?? "",
                row.Status.ToString() }.Select(Cell)));
        return Result<string>.Success(csv.ToString());
    }
    public static string Cell(string value)
    {
        // Quoting alone does not stop spreadsheet formula evaluation.
        if (value.TrimStart().StartsWith('=') || value.TrimStart().StartsWith('+') ||
            value.TrimStart().StartsWith('-') || value.TrimStart().StartsWith('@') ||
            value.StartsWith('\t') || value.StartsWith('\r')) value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
