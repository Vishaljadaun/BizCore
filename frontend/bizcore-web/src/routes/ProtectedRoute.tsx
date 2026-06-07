import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore }                   from '../store/authStore';
import { UserRole }                       from '../types';

interface Props {
  allowedRoles?: UserRole[];
  // If provided, only these roles can access the route
  // If not provided, any authenticated user can access
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Not logged in → redirect to login
  // We save the current location so after login we can redirect back
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        // state passes data to the login page
        // LoginPage can read: location.state?.from
        // Then after login: navigate(location.state?.from || '/dashboard')
        replace
        // replace = don't add /login to browser history
        // Pressing back won't return to the protected page
      />
    );
  }

  // Logged in but wrong role → redirect to unauthorized page
  if (
    allowedRoles &&
    user &&
    !allowedRoles.includes(user.role as UserRole)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed → render the child routes
  return <Outlet />;
  // Outlet = placeholder where nested routes render
};

export default ProtectedRoute;