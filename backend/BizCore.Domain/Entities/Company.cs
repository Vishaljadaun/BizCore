using BizCore.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Entities
{
    public class Company : BaseEntity  // NOT BaseTenantEntity — Company IS the tenant
    {
        public string Name { get; set; } = string.Empty;

        // URL-friendly version of name: "TechNova Solutions" → "technova-solutions"
        // Used in subdomains or API routes later
        public string Slug { get; set; } = string.Empty;

        public string? LogoUrl { get; set; }

        // trial | pro | enterprise — for future billing
        public string Subscription { get; set; } = "trial";

        public bool IsActive { get; set; } = true;

        // Navigation property — one company has many users
        public ICollection<User> Users { get; set; } = new List<User>();
    }
}
