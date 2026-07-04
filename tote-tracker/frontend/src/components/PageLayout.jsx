import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ToteIcon from './ToteIcon.jsx';

export default function PageLayout({ theme, onToggleTheme, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <div className="logo-icon" style={{ width: 40, height: 40 }}>
            <ToteIcon size={22} />
          </div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">Inventory Management</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <span>🗂</span> Totes
          </button>
          {user?.role === 'admin' && (
            <button
              className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`}
              onClick={() => navigate('/admin')}
            >
              <span>⚙</span> Users
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar-sm">{user?.name?.[0]?.toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-bar-name" style={{ fontSize: 13 }}>{user?.name}</div>
              <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="theme-toggle" onClick={onToggleTheme}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={logout} style={{ flex: 1 }}>
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
