using BizCore.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Application.Common.Interfaces
{
    public interface ITokenService
    {
        // Generates short-lived JWT (15 minutes)
        string GenerateAccessToken(User user);

        // Generates long-lived random token (7 days)
        string GenerateRefreshToken();

        // Reads a JWT and returns the userId inside it
        Guid? GetUserIdFromToken(string token);
    }
}
