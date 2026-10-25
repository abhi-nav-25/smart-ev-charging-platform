import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { Spinner } from './Spinner.jsx';
import { Alert } from './Alert.jsx';
import { ArrowLeft } from 'lucide-react';

export const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Spinner size="lg" label="Verifying administrator credentials..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="container" style={{ padding: '4rem 1rem', maxWidth: '640px' }}>
        <Alert type="danger" title="Access Denied (HTTP 403)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
            <p>
              Your account does not possess the <strong>admin</strong> role in the platform database. Administrator pages are restricted to authorized personnel.
            </p>
            <div>
              <Link to="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <ArrowLeft size={14} />
                Return to Station Discovery
              </Link>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return children;
};
