using BizCore.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Application.Common.Interfaces
{
    // Application layer defines WHAT it needs from the DB
    // but doesn't care HOW it's implemented
    // This is the Dependency Inversion principle
    public interface IApplicationDbContext
    {
        DbSet<Company> Companies { get; }
        DbSet<User> Users { get; }
        DbSet<RefreshToken> RefreshTokens { get; }
        DbSet<AuditLog> AuditLogs { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
