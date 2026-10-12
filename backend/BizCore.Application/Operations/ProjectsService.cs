using BizCore.Application.Common.Exceptions;
using BizCore.Domain.Entities.Operations;
using Microsoft.EntityFrameworkCore;
namespace BizCore.Application.Operations;
public partial class OperationsService
{
    public async Task<object> Projects(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("staff", ct);
        var q = db.WorkProjects.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (!Manager(u)) q = q.Where(p => db.ProjectTasks.Any(t => t.CompanyId == u.CompanyId && t.ProjectId == p.Id && t.AssignedUserId == u.Id));
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Name.ToLower().Contains(o.Search.ToLower()));
        if (!string.IsNullOrEmpty(o.Status)) q = q.Where(x => x.Status == o.Status);
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new {
            x.Id, x.Name, x.Description, x.DueDate, x.Status,
            TaskCount = db.ProjectTasks.Count(t => t.CompanyId == u.CompanyId && t.ProjectId == x.Id && (Manager(u) || t.AssignedUserId == u.Id)),
            CompletedTasks = db.ProjectTasks.Count(t => t.CompanyId == u.CompanyId && t.ProjectId == x.Id && t.Status == "Done" && (Manager(u) || t.AssignedUserId == u.Id))
        }), o, ct);
    }
    public Task<object> SaveProject(Guid? id, ProjectInput input, CancellationToken ct) => Write("manage", "SaveProject", async u => {
        var p = id.HasValue ? await Owned(db.WorkProjects, id.Value, u.CompanyId, ct) : new WorkProject { CompanyId = u.CompanyId };
        Require(p.Status == "Active", "Reopen the project before editing it.");
        p.Name = Text(input.Name, 150); p.Description = Text(input.Description, 2000, false); p.DueDate = input.DueDate;
        if (!id.HasValue) db.WorkProjects.Add(p); return p;
    }, ct);
    public Task<object> ProjectState(Guid id, string status, CancellationToken ct) => Write("manage", "ProjectState", async u => {
        Require(new[] { "Active", "Completed", "Archived" }.Contains(status), "Choose a valid project status.");
        var p = await Owned(db.WorkProjects, id, u.CompanyId, ct);
        if (status == "Completed") Conflict(await db.ProjectTasks.AnyAsync(t => t.CompanyId == u.CompanyId && t.ProjectId == id && t.Status != "Done", ct), "Complete all project tasks first.");
        p.Status = status; return p;
    }, ct);
    public async Task<object> Tasks(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("staff", ct);
        var q = db.ProjectTasks.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (!Manager(u) || o.Mine) q = q.Where(x => x.AssignedUserId == u.Id);
        if (o.ParentId.HasValue) q = q.Where(x => x.ProjectId == o.ParentId);
        if (!string.IsNullOrEmpty(o.Status)) q = q.Where(x => x.Status == o.Status);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Title.ToLower().Contains(o.Search.ToLower()));
        return await Page(q.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Select(x => new {
            x.Id, x.ProjectId, x.Title, x.Description, x.AssignedUserId, x.DueDate, x.Priority, x.Status,
            ProjectName = db.WorkProjects.Where(p => p.Id == x.ProjectId && p.CompanyId == u.CompanyId).Select(p => p.Name).FirstOrDefault(),
            AssigneeName = db.Users.Where(a => a.Id == x.AssignedUserId && a.CompanyId == u.CompanyId).Select(a => a.FirstName + " " + a.LastName).FirstOrDefault(),
            LoggedMinutes = db.TimeEntries.Where(t => t.TaskId == x.Id && t.CompanyId == u.CompanyId && (Manager(u) || t.UserId == u.Id)).Sum(t => t.Minutes)
        }), o, ct);
    }
    public Task<object> SaveTask(Guid? id, TaskInput input, CancellationToken ct) => Write("manage", "SaveTask", async u => {
        var project = await Owned(db.WorkProjects, input.ProjectId, u.CompanyId, ct);
        Require(project.Status == "Active", "Tasks require an active project.");
        if (input.AssignedUserId.HasValue) Require(await db.Users.AnyAsync(x => x.Id == input.AssignedUserId && x.CompanyId == u.CompanyId && x.IsActive && x.Role != BizCore.Domain.Enums.UserRole.Vendor, ct), "Choose an active staff account in your company.");
        var t = id.HasValue ? await Owned(db.ProjectTasks, id.Value, u.CompanyId, ct) : new ProjectTask { CompanyId = u.CompanyId };
        Require(!id.HasValue || t.ProjectId == input.ProjectId, "Tasks cannot be moved between projects.");
        t.ProjectId = project.Id; t.Title = Text(input.Title, 200); t.Description = Text(input.Description, 2000, false);
        Require(new[] { "Low", "Medium", "High" }.Contains(input.Priority), "Choose a valid priority.");
        t.AssignedUserId = input.AssignedUserId; t.DueDate = input.DueDate; t.Priority = input.Priority;
        if (!id.HasValue) db.ProjectTasks.Add(t); return t;
    }, ct);
    public Task<object> TaskState(Guid id, string status, CancellationToken ct) => Write("staff", "TaskState", async u => {
        Require(new[] { "Todo", "InProgress", "Done" }.Contains(status), "Choose a valid task status.");
        var t = await Owned(db.ProjectTasks, id, u.CompanyId, ct);
        if (!Manager(u) && t.AssignedUserId != u.Id) throw new ForbiddenAccessException("You can update only tasks assigned to you.");
        Require((await Owned(db.WorkProjects, t.ProjectId, u.CompanyId, ct)).Status == "Active", "Reopen the project before updating tasks.");
        t.Status = status; return t;
    }, ct);
    public async Task<object> TimeEntries(ListOptions o, CancellationToken ct)
    {
        var u = await Caller("staff", ct); var q = db.TimeEntries.AsNoTracking().Where(x => x.CompanyId == u.CompanyId);
        if (!Manager(u) || o.Mine) q = q.Where(x => x.UserId == u.Id);
        if (!string.IsNullOrWhiteSpace(o.Search)) q = q.Where(x => x.Note.ToLower().Contains(o.Search.ToLower()) || db.ProjectTasks.Any(t => t.Id == x.TaskId && t.CompanyId == u.CompanyId && t.Title.ToLower().Contains(o.Search.ToLower())));
        if (o.ParentId.HasValue) q = q.Where(x => db.ProjectTasks.Any(t => t.Id == x.TaskId && t.CompanyId == u.CompanyId && t.ProjectId == o.ParentId));
        return await Page(q.OrderByDescending(x => x.Date).ThenByDescending(x => x.CreatedAt).Select(x => new { x.Id, x.TaskId, x.UserId, x.Date, x.Minutes, x.Note,
            TaskTitle = db.ProjectTasks.Where(t => t.Id == x.TaskId && t.CompanyId == u.CompanyId).Select(t => t.Title).FirstOrDefault(),
            UserName = db.Users.Where(a => a.Id == x.UserId && a.CompanyId == u.CompanyId).Select(a => a.FirstName + " " + a.LastName).FirstOrDefault() }), o, ct);
    }
    public Task<object> AddTime(TimeInput input, CancellationToken ct) => Write("staff", "LogTime", async u => {
        var t = await Owned(db.ProjectTasks, input.TaskId, u.CompanyId, ct);
        if (!Manager(u) && t.AssignedUserId != u.Id) throw new ForbiddenAccessException("Log time only on your assigned tasks.");
        Require((await Owned(db.WorkProjects, t.ProjectId, u.CompanyId, ct)).Status == "Active", "Time can be logged only on active projects.");
        Require(input.Date != default && input.Date <= Today && input.Minutes is > 0 and <= 1440, "Choose a date no later than today and 1–1440 minutes.");
        var total = await db.TimeEntries.Where(x => x.CompanyId == u.CompanyId && x.UserId == u.Id && x.Date == input.Date).SumAsync(x => x.Minutes, ct);
        Conflict(total + input.Minutes > 1440, "Total time for a day cannot exceed 24 hours.");
        var entry = new TimeEntry { CompanyId = u.CompanyId, TaskId = t.Id, UserId = u.Id, Date = input.Date, Minutes = input.Minutes, Note = Text(input.Note, 1000, false) };
        db.TimeEntries.Add(entry); return entry;
    }, ct);
    public Task<object> DeleteTime(Guid id, CancellationToken ct) => Write("staff", "DeleteTime", async u => {
        var entry = await Owned(db.TimeEntries, id, u.CompanyId, ct);
        if (entry.UserId != u.Id && !Manager(u)) throw new ForbiddenAccessException("You can remove only your own time entries.");
        db.TimeEntries.Remove(entry); return entry;
    }, ct);
}
