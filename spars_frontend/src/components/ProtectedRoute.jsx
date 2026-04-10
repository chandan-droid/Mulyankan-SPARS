import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />
    );
  return <>{children}</>;
}
