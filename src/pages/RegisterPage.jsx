import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 60) {
      errors.name = 'Name must be between 2 and 60 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiError) setApiError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setApiError('');

    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });

      // Redirect back to intended route or default /dashboard
      const redirectPath = location.state?.from?.pathname || '/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to register account. Please try again.';
      setApiError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper" style={styles.wrapper}>
      <div className="auth-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logoBadge}>🚀</div>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Track and manage your dream jobs in one place</p>
        </div>

        {/* Error banner */}
        {apiError && (
          <div style={styles.errorBanner} role="alert">
            ⚠️ {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="register-name" style={styles.label}>
              Full Name
            </label>
            <input
              id="register-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Alice Johnson"
              autoComplete="name"
              disabled={submitting}
              style={{
                ...styles.input,
                ...(fieldErrors.name ? styles.inputError : {}),
              }}
            />
            {fieldErrors.name && (
              <span style={styles.inlineError}>{fieldErrors.name}</span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="register-email" style={styles.label}>
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={submitting}
              style={{
                ...styles.input,
                ...(fieldErrors.email ? styles.inputError : {}),
              }}
            />
            {fieldErrors.email && (
              <span style={styles.inlineError}>{fieldErrors.email}</span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="register-password" style={styles.label}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              disabled={submitting}
              style={{
                ...styles.input,
                ...(fieldErrors.password ? styles.inputError : {}),
              }}
            />
            {fieldErrors.password && (
              <span style={styles.inlineError}>{fieldErrors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.buttonDisabled : {}),
            }}
          >
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '36px 32px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
    border: '1px solid #334155',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoBadge: {
    fontSize: '2rem',
    marginBottom: '8px',
  },
  title: {
    margin: '0 0 6px 0',
    fontSize: '1.6rem',
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.92rem',
    color: '#94a3b8',
  },
  errorBanner: {
    backgroundColor: '#7f1d1d',
    color: '#fecaca',
    border: '1px solid #dc2626',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.88rem',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  input: {
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '0.95rem',
    color: '#f8fafc',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inlineError: {
    color: '#f87171',
    fontSize: '0.8rem',
    marginTop: '2px',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '13px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'background-color 0.2s, opacity 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '0.88rem',
    color: '#94a3b8',
  },
  link: {
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: '600',
  },
};

export default RegisterPage;
