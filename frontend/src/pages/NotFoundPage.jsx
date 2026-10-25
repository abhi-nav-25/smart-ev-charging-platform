import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '440px', margin: '0 auto' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-bg-muted)',
            color: 'var(--color-navy-700)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <HelpCircle size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Page Not Found</h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          The requested page does not exist or has been relocated within the VoltWay network.
        </p>
        <Link to="/" className="btn btn-primary btn-md" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <ArrowLeft size={16} />
          Return to Platform Home
        </Link>
      </div>
    </div>
  );
};
