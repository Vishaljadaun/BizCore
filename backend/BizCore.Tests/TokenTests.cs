using BizCore.Application.Auth.Commands;
using BizCore.Application.Common.Interfaces;
using BizCore.Domain.Entities;
using BizCore.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace BizCore.Tests;

public class TokenTests
{
    private static TokenService Service(string issuer = "bizcore-test", string expiry = "15") => new(
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> {
            ["JwtSettings:SecretKey"] = "test-only-signing-key-at-least-32-characters-long",
            ["JwtSettings:Issuer"] = issuer, ["JwtSettings:Audience"] = "bizcore-test-client",
            ["JwtSettings:AccessTokenExpiryMinutes"] = expiry,
        }).Build());

    [Fact]
    public void Refresh_validation_reads_the_mapped_subject_from_generated_and_expired_tokens()
    {
        var user = new User { Id = Guid.NewGuid(), CompanyId = Guid.NewGuid() };
        Assert.Equal(user.Id, Service().GetUserIdFromToken(Service().GenerateAccessToken(user)));
        Assert.Equal(user.Id, Service().GetUserIdFromToken(Service(expiry: "-1").GenerateAccessToken(user)));
        Assert.Null(Service().GetUserIdFromToken(Service("wrong-issuer").GenerateAccessToken(user)));
        Assert.Null(Service().GetUserIdFromToken("malformed"));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Refresh_revokes_tokens_for_inactive_user_or_company(bool disableUser)
    {
        await using var f = new EmployeeFixture();
        if (disableUser) f.User.IsActive = false;
        else f.User.Company.IsActive = false;
        f.Db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = f.User.Id,
            User = f.User, Token = "refresh-test", ExpiresAt = DateTime.UtcNow.AddDays(1) });
        await f.Db.SaveChangesAsync();
        var service = Service();
        var result = await new RefreshTokenCommandHandler(f.Db, service).Handle(
            new(service.GenerateAccessToken(f.User), "refresh-test"), default);
        Assert.False(result.IsSuccess);
        Assert.Equal(401, result.StatusCode);
        Assert.True((await f.Db.RefreshTokens.SingleAsync()).IsRevoked);
    }

    [Fact]
    public async Task Active_account_rotates_refresh_token_and_cannot_reuse_the_old_one()
    {
        await using var f = new EmployeeFixture();
        f.Db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = f.User.Id,
            User = f.User, Token = "refresh-test", ExpiresAt = DateTime.UtcNow.AddDays(1) });
        await f.Db.SaveChangesAsync();
        var service = Service();
        var handler = new RefreshTokenCommandHandler(f.Db, service);
        var command = new RefreshTokenCommand(service.GenerateAccessToken(f.User), "refresh-test");
        var result = await handler.Handle(command, default);
        Assert.True(result.IsSuccess);
        Assert.NotEqual("refresh-test", result.Data!.RefreshToken);
        Assert.False((await handler.Handle(command, default)).IsSuccess);
    }
}
