import { useState, useEffect }  from 'react';
import { useNavigate }           from 'react-router-dom';
import { companiesApi }          from '../../api/companiesApi';
import type {
  PlatformStats,
  CompanyResponse,
  PaginatedResponse,
}                                from '../../types';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats,     setStats]     =
    useState<PlatformStats | null>(null);
  const [companies, setCompanies] =
    useState<PaginatedResponse<CompanyResponse> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, companiesData] = await Promise.all([
          companiesApi.getStats(),
          companiesApi.getCompanies({ pageSize: 5 }),
          // Promise.all = dono calls parallel chalao
          // Faster than sequential calls
        ]);
        setStats(statsData);
        setCompanies(companiesData);
      } catch {
        console.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600
          border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Platform Overview
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          BizCore platform statistics and management
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2
        lg:grid-cols-5 gap-4 mb-8">

        <StatCard
          title="Total Companies"
          value={stats?.totalCompanies ?? 0}
          icon="🏢"
          color="blue"
        />
        <StatCard
          title="Active Companies"
          value={stats?.activeCompanies ?? 0}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Trial Companies"
          value={stats?.trialCompanies ?? 0}
          icon="⏳"
          color="yellow"
        />
        <StatCard
          title="Total Users"
          value={stats?.totalUsers ?? 0}
          icon="👥"
          color="purple"
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers ?? 0}
          icon="🟢"
          color="teal"
        />
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-xl border
        border-gray-100 shadow-sm">

        <div className="flex items-center justify-between
          px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">
            Recent Companies
          </h2>
          <button
            onClick={() => navigate('/companies')}
            className="text-sm text-primary-600
              hover:underline font-medium"
          >
            View All →
          </button>
        </div>

        <div className="divide-y divide-gray-50">
          {companies?.items.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between
                px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Company Avatar */}
                <div className="w-10 h-10 rounded-xl
                  bg-primary-100 flex items-center
                  justify-center">
                  <span className="text-primary-700
                    font-bold text-sm">
                    {company.name[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium
                    text-gray-900">
                    {company.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {company.totalUsers} users •{' '}
                    {company.slug}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Subscription badge */}
                <span className={`
                  px-2.5 py-1 rounded-full text-xs font-medium
                  ${company.subscription === 'trial'
                    ? 'bg-yellow-100 text-yellow-700'
                    : company.subscription === 'pro'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                  }
                `}>
                  {company.subscription}
                </span>

                {/* Status */}
                <span className={`
                  px-2.5 py-1 rounded-full text-xs font-medium
                  ${company.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }
                `}>
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>

                <button
                  onClick={() =>
                    navigate(`/companies/${company.id}`)
                  }
                  className="text-gray-400
                    hover:text-primary-600 text-sm px-2 py-1
                    rounded hover:bg-primary-50"
                >
                  View →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon:  string;
  color: string;
}) => {
  const colorMap: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-600',
    green:  'bg-green-50  text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    teal:   'bg-teal-50   text-teal-600',
  };

  return (
    <div className="bg-white rounded-xl border
      border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`
          w-10 h-10 rounded-xl flex items-center
          justify-center text-lg
          ${colorMap[color] || colorMap.blue}
        `}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500 mt-1">{title}</p>
    </div>
  );
};

export default SuperAdminDashboard;