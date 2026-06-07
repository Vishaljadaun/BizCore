using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Common
{
    // Every entity in the system inherits from this
    // So EVERY table automatically has: Id, CreatedAt, UpdatedAt
    // You never forget to add these columns again
    public abstract class BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
