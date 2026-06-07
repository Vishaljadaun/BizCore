using BizCore.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Entities
{
    // Records EVERY action taken in the system automatically
    // "Who did what, when, and what did it look like before and after"
    public class AuditLog : BaseEntity
    {
        public Guid? CompanyId { get; set; }
        public Guid? UserId { get; set; }
        public string Action { get; set; } = string.Empty;    // CREATE, UPDATE, DELETE
        public string Entity { get; set; } = string.Empty;    // "User", "Company"
        public string EntityId { get; set; } = string.Empty;
        public string? OldValues { get; set; }   // JSON of what it was before
        public string? NewValues { get; set; }   // JSON of what it changed to
        public string? IpAddress { get; set; }
    }
}
