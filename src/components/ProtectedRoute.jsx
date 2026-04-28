import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * <ProtectedRoute>
 * Wraps a route that requires authentication (and optionally a specific role).
 *
 * Props:
 *   allowedRoles  — array of roles that may access this route.
 *                   If omitted, any logged-in user is allowed.
 *                   e.g. allowedRoles={['super_admin', 'admin']}
 *
 * Role hierarchy: super_admin > admin > manager
 */

const ROLE_LEVEL = { manager: 1, admin: 2, super_admin: 3 };

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While the /me check is in-flight, render nothing (avoids flash)
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const minRequired = Math.min(...allowedRoles.map((r) => ROLE_LEVEL[r] ?? 0));
    const userLevel = ROLE_LEVEL[user.role] ?? 0;

    if (userLevel < minRequired) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;