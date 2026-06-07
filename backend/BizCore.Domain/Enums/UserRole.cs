using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Enums
{
    public enum UserRole
    {
        SuperAdmin = 1,    // Can see all companies
        CompanyAdmin = 2,  // Full access to their company
        Manager = 3,       // Access to their department
        Employee = 4,      // Access to own data only
        Vendor = 5         // Access to vendor portal only
    }
}
