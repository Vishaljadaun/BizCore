using BizCore.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Infrastructure.Services
{
    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUserService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public Guid? UserId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User.FindFirstValue(ClaimTypes.NameIdentifier);
                return Guid.TryParse(value, out var id) ? id : null;
            }
        }

        public Guid? CompanyId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User.FindFirstValue("company_id");
                return Guid.TryParse(value, out var id) ? id : null;
            }
        }

        public string? UserRole =>
            _httpContextAccessor.HttpContext?
                .User.FindFirstValue(ClaimTypes.Role);

        public string? IpAddress =>
            _httpContextAccessor.HttpContext?
                .Connection.RemoteIpAddress?.ToString();

        public Guid? EmployeeId
        {
            get
            {
                var value = _httpContextAccessor.HttpContext?
                    .User.FindFirstValue("employee_id");
                // "employee_id" claim JWT mein hoga
                return Guid.TryParse(value, out var id)
                    ? id : null;
            }
        }
    }
}
