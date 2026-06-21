namespace BizCore.Domain.Entities.HR;

using BizCore.Domain.Common;

public class Department : BaseTenantEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Manager of this department
    // Nullable — department can exist without a manager
    public Guid? ManagerId { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation properties
    public Employee? Manager { get; set; }
    public ICollection<Employee> Employees { get; set; }
        = new List<Employee>();
}