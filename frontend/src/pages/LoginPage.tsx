import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate('/');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Unable to login with the provided credentials.';
      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-view">
      <div className="auth-card">
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">Sign in to manage or share reviews.</p>

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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="auth-card__switch">
          Need an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
