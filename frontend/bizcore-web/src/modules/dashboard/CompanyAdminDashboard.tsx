import { useAuthStore } from '../../store/authStore';

const CompanyAdminDashboard = () => {
  const { user } = useAuthStore();

  const stats = [
    { title: 'Total Employees', value: '—', icon: '👥' },
    { title: 'Active Projects', value: '—', icon: '📋' },
    { title: 'Low Stock Items', value: '—', icon: '📦' },
    { title: 'Revenue MTD',     value: '—', icon: '💰' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening at {user?.companyName}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2
        lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title}
            className="bg-white rounded-xl border
              border-gray-100 shadow-sm p-6">
            <div className="flex items-center
              justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold
                  text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Available after module setup
            </p>
          </div>
        ))}
      </div>

      <div className="bg-primary-50 rounded-xl
        border border-primary-100 p-6">
        <h2 className="font-semibold text-primary-800 mb-4">
          Your Account
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4
          gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Name</p>
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Email</p>
            <p className="font-medium text-gray-900">
              {user?.email}
            </p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Role</p>
            <span className="inline-block px-2.5 py-1
              bg-primary-100 text-primary-700
              rounded-full text-xs font-medium">
              {user?.role}
            </span>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Company</p>
            <p className="font-medium text-gray-900">
              {user?.companyName}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyAdminDashboard;