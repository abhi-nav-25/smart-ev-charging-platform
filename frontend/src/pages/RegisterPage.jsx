import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, Zap, CheckCircle2 } from 'lucide-react';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const validate = () => {
    const errs = {};
    if (!formData.full_name.trim()) {
      errs.full_name = 'Full name is required.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please provide a valid email address.';
    }

    if (!formData.password) {
      errs.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await register({
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      phone: formData.phone || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      if (result.hasSession) {
        // Logged in automatically via issued Supabase session
        navigate('/stations', { replace: true });
      } else {
        // Confirmation email may be required in Supabase settings
        setRegistrationSuccess(true);
      }
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
      <div style={{ width: '100%', maxWidth: '480px' }}>
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
            Create Driver Account
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.9375rem' }}>
            Join VoltWay to discover EV chargers and reserve physical slots in real time.
          </p>
        </div>

        {/* Card */}
        <div className="card">
          {registrationSuccess ? (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-electric-green-subtle)',
                  color: 'var(--color-electric-green-active)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ marginBottom: '0.75rem' }}>Account Created Successfully!</h3>
              <p className="text-secondary" style={{ fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                Your VoltWay driver profile has been created in the database. You can now sign in using your email and password.
              </p>
              <Link to="/login" className="btn btn-primary btn-block">
                Proceed to Sign In
              </Link>
            </div>
          ) : (
            <>
              {serverError && (
                <Alert type="danger" onClose={() => setServerError(null)}>
                  {serverError}
                </Alert>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <Input
                  label="Full Name"
                  id="full_name"
                  name="full_name"
                  placeholder="e.g. Alex Green"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  error={errors.full_name}
                  required
                  autoComplete="name"
                  icon={User}
                />

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

                <Input
                  label="Phone Number (Optional)"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  autoComplete="tel"
                  icon={Phone}
                  hint="Used for reservation confirmation notices."
                />

                <div style={{ position: 'relative' }}>
                  <Input
                    label="Password"
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    required
                    autoComplete="new-password"
                    icon={Lock}
                    hint="Must be at least 6 characters."
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
                  variant="electric"
                  size="lg"
                  block
                  loading={isSubmitting}
                  icon={UserPlus}
                  style={{ marginTop: '0.75rem' }}
                >
                  Complete Registration
                </Button>
              </form>

              {/* Login link */}
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
                Already have an account?{' '}
                <Link
                  to="/login"
                  style={{ color: 'var(--color-navy-900)', fontWeight: 700 }}
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
