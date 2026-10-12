using BizCore.Application.Common.Exceptions;
using BizCore.Application.HR.Employees;
using BizCore.Application.HR.Departments;
using BizCore.Application.Security;
using BizCore.Application.Users.Commands;
using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace BizCore.Tests;

public class AccountSecurityTests
{
    private const string Original = "Original-Password42!";
    private const string Replacement = "Replacement-Password42!";
    private static async Task Admin(EmployeeFixture f)
    {
        f.User.Role = UserRole.CompanyAdmin; f.Current.UserRole = "CompanyAdmin";
        f.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(Original, 4);
        await f.Db.SaveChangesAsync();
    }

    [Fact]
    public async Task Change_requires_current_password_and_revokes_every_session()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        f.Db.RefreshTokens.Add(new RefreshToken { UserId = f.User.Id, Token = "previous-session", ExpiresAt = DateTime.UtcNow.AddDays(1) });
        f.User.MustChangePassword = true; await f.Db.SaveChangesAsync();
        var service = new PasswordService(f.Db, f.Current);
        await Assert.ThrowsAsync<ValidationException>(() => service.Change(new("wrong", Replacement), default));
        Assert.Equal(0, f.User.CredentialVersion);
        Assert.False((await f.Db.RefreshTokens.SingleAsync()).IsRevoked);
        await service.Change(new(Original, Replacement), default);
        Assert.True(BCrypt.Net.BCrypt.Verify(Replacement, f.User.PasswordHash));
        Assert.Equal(1, f.User.CredentialVersion); Assert.False(f.User.MustChangePassword);
        Assert.True((await f.Db.RefreshTokens.SingleAsync()).IsRevoked);
        Assert.Equal("ChangePassword", (await f.Db.AuditLogs.SingleAsync()).Action);
    }

    [Fact]
    public async Task Reset_requires_admin_password_and_cannot_cross_tenants_or_reset_self()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        var other = new User { CompanyId = f.User.CompanyId, Company = f.User.Company, Role = UserRole.Employee, Email = "member@example.com", PasswordHash = f.User.PasswordHash };
        var foreign = new User { CompanyId = Guid.NewGuid(), Role = UserRole.Employee };
        f.Db.Users.AddRange(other, foreign); await f.Db.SaveChangesAsync();
        var service = new PasswordService(f.Db, f.Current);
        await Assert.ThrowsAsync<NotFoundException>(() => service.Reset(foreign.Id, new(Original, Replacement), default));
        await Assert.ThrowsAsync<ValidationException>(() => service.Reset(f.User.Id, new(Original, Replacement), default));
        await Assert.ThrowsAsync<ValidationException>(() => service.Reset(other.Id, new("wrong", Replacement), default));
        Assert.False(other.MustChangePassword);
        await service.Reset(other.Id, new(Original, Replacement), default);
        Assert.True(other.MustChangePassword); Assert.Equal(1, other.CredentialVersion);
        Assert.True(BCrypt.Net.BCrypt.Verify(Replacement, other.PasswordHash));
    }

    [Fact]
    public async Task Company_admin_cannot_promote_a_user_to_company_admin()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        var other = new User { CompanyId = f.User.CompanyId, Role = UserRole.Employee };
        f.Db.Users.Add(other); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<ForbiddenAccessException>(() => new ChangeRoleCommandHandler(f.Db, f.Current).Handle(new(other.Id, UserRole.CompanyAdmin), default));
        Assert.Equal(UserRole.Employee, other.Role);
    }

    [Fact]
    public async Task Department_manager_and_employee_department_must_belong_to_company()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        var foreign = new Employee { CompanyId = Guid.NewGuid(), DepartmentId = Guid.NewGuid() };
        f.Db.Employees.Add(foreign); await f.Db.SaveChangesAsync();
        await Assert.ThrowsAsync<ValidationException>(() => new UpdateDepartmentCommandHandler(f.Db, f.Current).Handle(new(f.Own.DepartmentId, "Engineering", null, foreign.Id), default));
        await Assert.ThrowsAsync<ValidationException>(() => new EditEmployeeService(f.Db, f.Current).Edit(f.Other.Id, new("First", "Last", "x@example.com", null, "Engineer", foreign.DepartmentId, new DateOnly(2026, 1, 1), 100), default));
    }

    [Fact]
    public async Task Deactivation_preserves_employee_history_and_requires_separate_login_reactivation()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        var linked = new User { CompanyId = f.User.CompanyId, Role = UserRole.Employee, EmployeeId = f.Other.Id };
        f.Other.UserId = linked.Id; f.Db.Users.Add(linked); await f.Db.SaveChangesAsync();
        var service = new EditEmployeeService(f.Db, f.Current);
        await service.Status(f.Other.Id, false, default);
        Assert.False(f.Other.IsActive); Assert.False(linked.IsActive); Assert.Equal(1, linked.CredentialVersion);
        Assert.Equal(2, await f.Db.Employees.CountAsync());
        await service.Status(f.Other.Id, true, default);
        Assert.True(f.Other.IsActive); Assert.False(linked.IsActive);
    }

    [Fact]
    public async Task Last_active_company_admin_is_protected()
    {
        await using var f = new EmployeeFixture(); await Admin(f);
        await Assert.ThrowsAsync<ConflictException>(() => AccountAccess.ProtectLastAdmin(f.Db, f.User, default));
    }
}
