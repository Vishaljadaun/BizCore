using BizCore.Domain.Common;
using BizCore.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Entities
{
    public class User : BaseTenantEntity  // Has CompanyId built in
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // NEVER store plain text password. Ever.
        // BCrypt turns "mypassword123" into "$2a$11$xyz..." irreversibly
        public string PasswordHash { get; set; } = string.Empty;

        public UserRole Role { get; set; } = UserRole.Employee;
        public bool IsActive { get; set; } = true;
        public DateTime? LastLogin { get; set; }

        // ── New: Link to HR Employee profile ──────────────
        public Guid? EmployeeId { get; set; }
        // Nullable: SuperAdmin, pure admins don't have HR profile

        // Navigation property — who created this user
        public Company Company { get; set; } = null!;

        // One user can have many refresh tokens (multiple devices)
        public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

        // Computed property — no DB column needed
        public string FullName => $"{FirstName} {LastName}";
    }
}
