using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure.Persistence
{
    public class BizCoreDbSeeder
    {
        private readonly BizCoreDbContext _context;
        private readonly ILogger<BizCoreDbSeeder> _logger;

        public BizCoreDbSeeder(
            BizCoreDbContext context,
            ILogger<BizCoreDbSeeder> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Apply any pending migrations automatically on startup
                // In development this is convenient
                // In production you'd run migrations manually
                await _context.Database.MigrateAsync();

                await SeedSuperAdminAsync();

                _logger.LogInformation("Database seeded successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "An error occurred while seeding the database");
                throw;
            }
        }

        private async Task SeedSuperAdminAsync()
        {
            // Check if SuperAdmin company already exists
            // Idempotent = safe to run multiple times
            var superAdminCompany = await _context.Companies
                .IgnoreQueryFilters() // Bypass tenant filter for seeding
                .FirstOrDefaultAsync(c => c.Slug == "bizcore-system");

            if (superAdminCompany == null)
            {
                _logger.LogInformation("Seeding SuperAdmin company and user...");

                // Create the system company
                superAdminCompany = new Company
                {
                    Id = Guid.NewGuid(),
                    Name = "BizCore System",
                    Slug = "bizcore-system",
                    Subscription = "enterprise",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Companies.AddAsync(superAdminCompany);

                // Create the SuperAdmin user
                var superAdmin = new User
                {
                    Id = Guid.NewGuid(),
                    CompanyId = superAdminCompany.Id,
                    FirstName = "Super",
                    LastName = "Admin",
                    Email = "superadmin@bizcore.com",
                    // BCrypt hashes the password — never store plain text
                    // Change this password immediately after first login!
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
                    Role = UserRole.SuperAdmin,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(superAdmin);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "SuperAdmin created. Email: superadmin@bizcore.com | " +
                    "Password: Admin@123456 | CHANGE THIS IMMEDIATELY!");
            }
            else
            {
                _logger.LogInformation("SuperAdmin already exists. Skipping seed.");
            }
        }
    }
}
