import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { Mail, Lock, Eye, EyeOff, LogIn, Zap, Info } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectUrl = new URLSearchParams(location.search).get('redirect') || '/stations';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await login(formData.email, formData.password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(redirectUrl, { replace: true });
    } else {
      setServerError(result.error);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--navbar-height) - 150px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              backgroundColor: 'var(--color-navy-900)',
              color: 'var(--color-electric-green)',
              borderRadius: 'var(--radius-md)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <Zap size={24} fill="currentColor" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Sign In to VoltWay
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
            Access live station discovery, reservations, and driver history.
          </p>
        </div>

        {/* Login Card */}
        <div className="card">
          {serverError && (
            <Alert type="danger" onClose={() => setServerError(null)}>
              {serverError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="Email Address"
              id="email"
              name="email"
              type="email"
              placeholder="driver@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
              autoComplete="email"
              icon={Mail}
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Password"
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={errors.password}
                required
                autoComplete="current-password"
                icon={Lock}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.875rem',
                  top: '38px',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={isSubmitting}
              icon={LogIn}
              style={{ marginTop: '0.5rem' }}
            >
              Sign In to Account
            </Button>
          </form>

          {/* Quick Registration Footer */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--color-border-subtle)',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Don't have an account yet?{' '}
            <Link
              to={`/register${location.search}`}
              style={{ color: 'var(--color-electric-green-hover)', fontWeight: 700 }}
            >
              Create driver account
            </Link>
          </div>
        </div>

        {/* Academic / Demo Role Advisory */}
        <div
          style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: 'var(--color-bg-muted)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--color-navy-600)' }} />
          <div>
            <strong>Administrator Access Note:</strong>
            <p style={{ marginTop: '0.25rem' }}>
              Roles are enforced in PostgreSQL. To test the Admin Console, use an admin-elevated account (e.g. configured with <code>role = &apos;admin&apos;</code> in <code>public.profiles</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
