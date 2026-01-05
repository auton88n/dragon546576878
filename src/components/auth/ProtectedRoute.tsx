import { ReactNode, useEffect, useState } from 'react';
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
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate('/login', { state: { from: location }, replace: true });
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!role || !allowedRoles.includes(role as AllowedRole)) {
        navigate('/', { replace: true });
        return;
      }
    }

    setShouldRender(true);
  }, [isAuthenticated, isLoading, role, allowedRoles, navigate, location]);

  if (isLoading || !shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
