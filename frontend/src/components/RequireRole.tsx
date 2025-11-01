import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RequireRoleProps {
  roles: string[];
  children: React.ReactElement;
}

const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, hasRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="full-screen-message">Checking your session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasRole(...roles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireRole;
