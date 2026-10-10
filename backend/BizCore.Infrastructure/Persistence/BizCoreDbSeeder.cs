using BizCore.Domain.Entities;
using BizCore.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
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
        private readonly IConfiguration _configuration;

        public BizCoreDbSeeder(
            BizCoreDbContext context,
            ILogger<BizCoreDbSeeder> logger, IConfiguration configuration)
        {
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task SeedAsync()
        {
            try
            {
                // Apply any pending migrations automatically on startup
                // In development this is convenient
                // In production you'd run migrations manually
                await _context.Database.MigrateAsync();

                if (_configuration.GetValue<bool>("Seed:Enabled"))
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
            var email = _configuration["Seed:SuperAdminEmail"]?.Trim().ToLowerInvariant();
            var password = _configuration["Seed:SuperAdminPassword"];
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password) || password.Length < 12)
                throw new InvalidOperationException("Seeding requires Seed:SuperAdminEmail and a private Seed:SuperAdminPassword of at least 12 characters.");

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
                    Email = email,
                    // BCrypt hashes the password — never store plain text
                    // Change this password immediately after first login!
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                    Role = UserRole.SuperAdmin,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Users.AddAsync(superAdmin);
                await _context.SaveChangesAsync();

                _logger.LogInformation("SuperAdmin created using credentials from private configuration.");
            }
            else
            {
                _logger.LogInformation("SuperAdmin already exists. Skipping seed.");
            }
        }
    }
}
