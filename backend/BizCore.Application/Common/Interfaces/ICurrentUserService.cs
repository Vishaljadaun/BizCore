using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Application.Common.Interfaces
{
    // Available everywhere in the app
    // "Who is currently making this API call?"
    public interface ICurrentUserService
    {
        Guid? UserId { get; }
        Guid? CompanyId { get; }    // The tenant key
        string? UserRole { get; }
        string? IpAddress { get; }

        Guid? EmployeeId { get; }
    }
}
