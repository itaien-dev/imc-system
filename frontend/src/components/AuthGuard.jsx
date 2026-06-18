import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Blocks access unless logged in. Pass adminOnly to also require the admin role. */
export default function AuthGuard({ adminOnly = false }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/profile" replace />;

  return <Outlet />;
}
