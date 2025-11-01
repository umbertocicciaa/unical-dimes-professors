import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PASSWORD_MIN_LENGTH = 12;

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        (Array.isArray(err?.response?.data) ? err.response.data[0]?.msg : null) ||
        'Unable to create your account. Please verify the details and try again.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-view">
      <div className="auth-card">
        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__subtitle">
          Passwords must be at least {PASSWORD_MIN_LENGTH} characters. We use Argon2 hashing to keep them safe.
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__label" htmlFor="email">
            Email
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="auth-form__label" htmlFor="password">
            Password
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </label>

          <label className="auth-form__label" htmlFor="confirm-password">
            Confirm Password
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Register'}
          </button>
        </form>

        <p className="auth-card__switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
