import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../../features/auth/hooks/useAuth';

type RoleGuardProps = {
  allowedRoles: string[];
};

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { user } = useAuth();

  // اگر لاگین نکرده
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // اگر role مجاز نداره
  const hasAccess = user.roles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  // اجازه دسترسی
  return <Outlet />;
};
