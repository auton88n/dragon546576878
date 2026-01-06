import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

type AllowedRole = 'admin' | 'scanner' | 'manager' | 'support';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AllowedRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, role } = useAuthStore();

  // Determine if we're still loading auth state
  // This includes: initial load OR authenticated but role not yet fetched
  const isAuthLoading = isLoading || (isAuthenticated && allowedRoles?.length && !role);

  useEffect(() => {
    // Don't redirect while still loading
    if (isAuthLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    // Check role permissions if required
    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role as AllowedRole)) {
        navigate('/', { replace: true });
        return;
      }
    }
  }, [isAuthenticated, isAuthLoading, role, allowedRoles, navigate, location]);

  // Show loading spinner while auth state is being determined
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authenticated - will redirect in useEffect
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Check role access
  if (allowedRoles && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role as AllowedRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoadingSpinner size="lg" />
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
