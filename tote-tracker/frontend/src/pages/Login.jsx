import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import LangToggle from '../components/LangToggle.jsx';
import ToteIcon from '../components/ToteIcon.jsx';
import useTheme from '../hooks/useTheme.js';

export default function Login() {
  const { login, register } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

  const [mode, setMode] = useState('login');
  const [registrationOpen, setRegistrationOpen] = useState(null);
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/registration-status')
      .then(r => r.json())
      .then(d => setRegistrationOpen(d.open))
      .catch(() => setRegistrationOpen(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.name, form.password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8 }}>
        <button className="theme-toggle" onClick={toggle}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <LangToggle />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 52, height: 52 }}>
            <ToteIcon size={28} />
          </div>
          <div className="app-title" style={{ fontSize: 22, marginTop: 12 }}>Tote Tracker</div>
          <div className="app-subtitle" style={{ marginTop: 4 }}>{t('app.subtitle')}</div>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >{t('login.signIn')}</button>
          {registrationOpen && (
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(''); }}
            >{t('login.createAccount')}</button>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>{t('login.email')}</label>
            <input
              className="input input-full"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoFocus
              required
            />
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>{t('login.fullName')}</label>
              <input
                className="input input-full"
                type="text"
                placeholder={t('login.namePlaceholder')}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          )}

          <div className="field">
            <label>{t('login.password')}</label>
            <input
              className="input input-full"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? t('login.pleaseWait') : mode === 'login' ? t('login.signIn') : t('login.createAccount')}
          </button>
        </form>

        {mode === 'register' && (
          <p className="auth-note">
            {t('login.firstAdminNote')}
          </p>
        )}

        {registrationOpen === false && (
          <p className="auth-note" style={{ textAlign: 'center' }}>
            {t('login.regClosed')}
          </p>
        )}
      </div>
    </div>
  );
}
