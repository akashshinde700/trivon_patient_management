import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RequireRole({ allowed = [], children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowed.length && !allowed.includes(user.role)) {
    return <div className="p-4 text-sm text-red-600">You do not have access to this section.</div>;
  }
  return children;
}

