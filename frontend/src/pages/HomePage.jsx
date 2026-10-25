import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService.js';
import {
  MapPin,
  CalendarCheck,
  ShieldCheck,
  Clock,
  ArrowRight,
  Layers
} from 'lucide-react';

export const HomePage = () => {
  const [serverStatus, setServerStatus] = useState({
    loading: true,
    healthy: false,
    uptime: null,
    environment: null,
  });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await authService.getHealth();
        if (isMounted && res.success && res.data) {
          setServerStatus({
            loading: false,
            healthy: res.data.status === 'healthy',
            uptime: res.data.uptime,
            environment: res.data.environment,
          });
        }
      } catch {
        if (isMounted) {
          setServerStatus({
            loading: false,
            healthy: false,
            uptime: null,
            environment: null,
          });
        }
      }
    };

    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section
        style={{
          backgroundColor: 'var(--color-navy-900)',
          color: '#FFFFFF',
          padding: '4.5rem 0 5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
        }}
      >
        <div className="container">
          <div style={{ maxWidth: '820px' }}>
            {/* Live System Status Pill */}
            <div style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.9)',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: serverStatus.healthy ? 'var(--color-electric-green)' : 'var(--color-amber-500)',
                  }}
                />
                {serverStatus.loading
                  ? 'Connecting to Express REST API...'
                  : serverStatus.healthy
                  ? `Backend Operational • Node 22 API Uptime: ${serverStatus.uptime}`
                  : 'Backend API Offline (Local server not detected on :5000)'}
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.25rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                color: '#FFFFFF',
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}
            >
              Real-time EV charging discovery &amp; reservation across Bangalore.
            </h1>

            <p
              style={{
                fontSize: '1.15rem',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.8)',
                marginBottom: '2.25rem',
                maxWidth: '680px',
              }}
            >
              VoltWay connects drivers directly to 5 high-speed charging hubs with live physical connector availability, authoritative pricing, and PostgreSQL GiST double-booking protection.
            </p>

            {/* Direct Action Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Link
                to="/stations"
                className="btn btn-electric btn-lg"
                style={{ textDecoration: 'none' }}
              >
                <MapPin size={18} />
                Explore Bangalore Stations
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/bookings/my"
                className="btn btn-outline btn-lg"
                style={{
                  color: '#FFFFFF',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  textDecoration: 'none',
                }}
              >
                <CalendarCheck size={18} />
                My Reservations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Real Architecture Guarantees Section */}
      <section style={{ padding: '4rem 0', backgroundColor: 'var(--color-bg-canvas)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 700,
                color: 'var(--color-electric-green-active)',
                display: 'block',
                marginBottom: '0.375rem',
              }}
            >
              Cloud Architecture &amp; Design
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              Engineered for Real-World Reliability
            </h2>
            <p className="text-secondary" style={{ marginTop: '0.5rem', maxWidth: '640px' }}>
              Designed around authentic engineering guarantees to eliminate driver uncertainty and race conditions at the charging bay.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Feature 1 */}
            <div className="card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-navy-900)',
                  color: 'var(--color-electric-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Mathematical Concurrency Lock
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                PostgreSQL <code>btree_gist</code> exclusion constraints enforce zero overlapping reservations for the exact same physical connector at the database layer.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-navy-900)',
                  color: 'var(--color-electric-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                15-Minute Expiration Hold
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Unpaid pending reservations automatically expire after 15 minutes, instantly returning slots to the public pool so charging bays are never held hostage.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-navy-900)',
                  color: 'var(--color-electric-green)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Layers size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>
                Authoritative Pricing
              </h3>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                Estimated costs are computed server-side from station rates and reservation duration to prevent client tampering and guarantee financial accuracy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Station Preview Banner */}
      <section
        style={{
          padding: '3rem 0',
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--color-border-subtle)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                Ready to find an available connector?
              </h3>
              <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
                Inspect live availability across Tech Park, Airport Express, Central Mall, Highway Oasis, and Metro Green Power hubs.
              </p>
            </div>
            <Link to="/stations" className="btn btn-primary btn-md">
              <MapPin size={16} />
              Open Live Station Map
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
