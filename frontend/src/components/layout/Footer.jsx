import { Link } from 'react-router-dom';
import { Zap, Server, ShieldCheck } from 'lucide-react';

export const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--color-navy-950)',
        color: 'var(--color-text-inverse-muted)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '3rem 0 2rem',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '2.5rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Brand & Purpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: 'var(--color-electric-green)',
                  color: 'var(--color-navy-950)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                }}
              >
                <Zap size={16} fill="currentColor" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                Volt<span style={{ color: 'var(--color-electric-green)' }}>Way</span>
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.7)' }}>
              Cloud-Based Smart EV Charging and Reservation Platform with Real-Time Monitoring. Built for driver reliability and concurrent reservation accuracy across Bangalore.
            </p>
          </div>

          {/* Platform Navigation */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.9375rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Platform Navigation
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <li>
                <Link to="/stations" className="footer-link">
                  Explore Bangalore Hubs
                </Link>
              </li>
              <li>
                <Link to="/bookings/my" className="footer-link">
                  Manage Reservations
                </Link>
              </li>
              <li>
                <Link to="/login" className="footer-link">
                  Driver Portal Login
                </Link>
              </li>
              <li>
                <Link to="/admin" className="footer-link">
                  Operator Admin Console
                </Link>
              </li>
            </ul>
          </div>

          {/* Cloud Architecture Specs */}
          <div>
            <h4 style={{ color: '#FFFFFF', fontSize: '0.9375rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cloud Architecture Specs
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={14} color="var(--color-electric-green)" />
                <span>AWS EC2 (Amazon Linux 2023, t3.micro)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} color="var(--color-electric-green)" />
                <span>Supabase PostgreSQL with GiST Lock</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Zap size={14} color="var(--color-electric-green)" />
                <span>Node.js 22 LTS + PM2 Supervisor</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8125rem',
          }}
        >
          <span>
            VoltWay Platform &copy; 2026. Cloud Architecture & Design (CAD) Project.
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
              <span className="badge-dot" />
              REST API CONNECTED
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
