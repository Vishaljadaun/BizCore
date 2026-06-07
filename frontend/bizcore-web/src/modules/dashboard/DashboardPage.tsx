import { useAuthStore }       from '../../store/authStore';
import { UserRole }           from '../../types';
import SuperAdminDashboard    from './SuperAdminDashboard';
import CompanyAdminDashboard  from './CompanyAdminDashboard';

const DashboardPage = () => {
  const { user } = useAuthStore();

  // Role ke hisaab se alag dashboard dikhao
  if (user?.role === UserRole.SuperAdmin) {
    return <SuperAdminDashboard />;
  }

  return <CompanyAdminDashboard />;
};

export default DashboardPage;