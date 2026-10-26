import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth.js';
import { Badge } from '../common/Badge.jsx';
import {
  Zap,
  MapPin,
  CalendarCheck,
  Shield,
  LogOut,
  User,
  Menu,
  X,
  LogIn,
  UserPlus
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header
      style={{
        backgroundColor: 'var(--color-navy-900)',
        color: '#FFFFFF',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          height: 'var(--navbar-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={closeMobile}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--color-electric-green)',
              color: 'var(--color-navy-950)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              boxShadow: '0 0 12px var(--color-electric-green-glow)',
            }}
          >
            <Zap size={22} fill="currentColor" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
                lineHeight: 1.1,
              }}
            >
              Volt<span style={{ color: 'var(--color-electric-green)' }}>Way</span>
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-text-inverse-muted)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Smart EV Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1.5rem',
          }}
          className="desktop-nav"
        >
          <NavLink
            to="/stations"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: isActive ? 'var(--color-electric-green)' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              padding: '0.375rem 0',
              borderBottom: isActive ? '2px solid var(--color-electric-green)' : '2px solid transparent',
              transition: 'color var(--transition-fast)',
            })}
          >
            <MapPin size={16} />
            Explore Stations
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to="/bookings/my"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: isActive ? 'var(--color-electric-green)' : 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                padding: '0.375rem 0',
                borderBottom: isActive ? '2px solid var(--color-electric-green)' : '2px solid transparent',
                transition: 'color var(--transition-fast)',
              })}
            >
              <CalendarCheck size={16} />
              My Reservations
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: isActive ? 'var(--color-electric-green)' : 'rgba(255, 255, 255, 0.8)',
                textDecoration: 'none',
                padding: '0.375rem 0',
                borderBottom: isActive ? '2px solid var(--color-electric-green)' : '2px solid transparent',
                transition: 'color var(--transition-fast)',
              })}
            >
              <Shield size={16} />
              Admin Portal
            </NavLink>
          )}
        </nav>

        {/* Right Section: Auth State */}
        <div
          style={{
            display: 'none',
            alignItems: 'center',
            gap: '1rem',
          }}
          className="desktop-auth"
        >
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-navy-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-electric-green)',
                  }}
                >
                  <User size={14} />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
                  {user?.profile?.full_name || user?.email?.split('@')[0]}
                </span>
                {isAdmin ? (
                  <Badge status="admin" label="ADMIN" showDot={false} />
                ) : (
                  <Badge status="neutral" label="DRIVER" showDot={false} />
                )}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.7)',
                  background: 'none',
                  border: 'none',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  transition: 'color var(--transition-fast)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
                title="Sign out"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link
                to="/login"
                className="btn btn-ghost btn-sm"
                style={{ color: '#FFFFFF' }}
              >
                <LogIn size={15} />
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-electric btn-sm"
              >
                <UserPlus size={15} />
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            color: '#FFFFFF',
            background: 'none',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
          }}
          className="mobile-toggle"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--color-navy-950)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '1rem var(--space-4) 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
          className="mobile-drawer"
        >
          <NavLink
            to="/stations"
            onClick={closeMobile}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.625rem',
              color: isActive ? 'var(--color-electric-green)' : '#FFFFFF',
              fontWeight: 600,
              fontSize: '1rem',
            })}
          >
            <MapPin size={18} />
            Explore Stations
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to="/bookings/my"
              onClick={closeMobile}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem',
                color: isActive ? 'var(--color-electric-green)' : '#FFFFFF',
                fontWeight: 600,
                fontSize: '1rem',
              })}
            >
              <CalendarCheck size={18} />
              My Reservations
            </NavLink>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              onClick={closeMobile}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.625rem',
                color: isActive ? 'var(--color-electric-green)' : '#FFFFFF',
                fontWeight: 600,
                fontSize: '1rem',
              })}
            >
              <Shield size={18} />
              Admin Portal
            </NavLink>
          )}

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                    Signed in as <strong>{user?.email}</strong>
                  </span>
                  <Badge status={isAdmin ? 'admin' : 'neutral'} label={isAdmin ? 'ADMIN' : 'DRIVER'} showDot={false} />
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-secondary btn-block btn-sm"
                  style={{ justifyContent: 'center' }}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link
                  to="/login"
                  onClick={closeMobile}
                  className="btn btn-outline btn-block btn-sm"
                  style={{ color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.3)' }}
                >
                  <LogIn size={15} />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={closeMobile}
                  className="btn btn-electric btn-block btn-sm"
                >
                  <UserPlus size={15} />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Responsive media styling for desktop nav */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .desktop-auth { display: flex !important; }
          .mobile-toggle { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
      `}</style>
    </header>
  );
};
