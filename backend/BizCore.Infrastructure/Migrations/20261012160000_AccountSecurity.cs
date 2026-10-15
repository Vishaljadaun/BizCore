using BizCore.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
namespace BizCore.Infrastructure.Migrations;
[DbContext(typeof(BizCoreDbContext))]
[Migration("20261012160000_AccountSecurity")]
public class AccountSecurity : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>("CredentialVersion", "users", schema: "shared", type: "integer", nullable: false, defaultValue: 0);
        migrationBuilder.AddColumn<bool>("MustChangePassword", "users", schema: "shared", type: "boolean", nullable: false, defaultValue: false);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn("CredentialVersion", "users", "shared");
        migrationBuilder.DropColumn("MustChangePassword", "users", "shared");
    }
}
