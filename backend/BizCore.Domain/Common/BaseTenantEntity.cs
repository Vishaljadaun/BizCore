using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BizCore.Domain.Common
{
    public abstract class BaseTenantEntity : BaseEntity
    {
        public Guid CompanyId { get; set; }
    }
}
