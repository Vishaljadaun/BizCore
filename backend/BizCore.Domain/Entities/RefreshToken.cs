using BizCore.Domain.Common;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Entities
{
    // Allows users to stay logged in without re-entering password
    // Short-lived Access Token (15 min) + Long-lived Refresh Token (7 days)
    public class RefreshToken : BaseEntity
    {
        public Guid UserId { get; set; }
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public bool IsRevoked { get; set; } = false;

        // Was this token used to create a new one?
        // Security: a used token should never work again
        public bool IsUsed { get; set; } = false;

        public User User { get; set; } = null!;
    }
}
