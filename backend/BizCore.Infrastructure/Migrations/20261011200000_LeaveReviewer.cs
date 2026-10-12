using Microsoft.EntityFrameworkCore.Migrations;
#nullable disable
namespace BizCore.Infrastructure.Migrations;
public partial class LeaveReviewer : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(name: "ReviewedByUserId", schema: "hr", table: "leave_requests", type: "uuid", nullable: true);
        migrationBuilder.AddColumn<string>(name: "ReviewedByName", schema: "hr", table: "leave_requests", type: "character varying(201)", maxLength: 201, nullable: true);
    }
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "ReviewedByName", schema: "hr", table: "leave_requests");
        migrationBuilder.DropColumn(name: "ReviewedByUserId", schema: "hr", table: "leave_requests");
    }
}
