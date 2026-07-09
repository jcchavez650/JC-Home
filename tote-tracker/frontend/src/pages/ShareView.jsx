import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLang } from '../context/LangContext.jsx';
import LangToggle from '../components/LangToggle.jsx';
import ToteIcon from '../components/ToteIcon.jsx';

export default function ShareView({ theme, onToggleTheme }) {
  const { token } = useParams();
  const { t, lang } = useLang();
  const [tote, setTote] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`/api/totes/share/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setTote)
      .catch(() => setError(true));
  }, [token]);

  const items = tote?.items || [];
  const totalQty = useMemo(() => items.reduce((sum, i) => sum + (i.quantity || 1), 0), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.name?.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const updatedText = useMemo(() => {
    if (!tote?.updated_at) return null;
    const d = new Date(tote.updated_at.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return null;
    return t('share.updated', { date: d.toLocaleDateString(lang === 'es' ? 'es' : 'en') });
  }, [tote, lang]);

  if (error) return (
    <div className="page-loading">
      <div className="loader-dots">
        <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      </div>
      <span>{t('share.notFound')}</span>
    </div>
  );

  if (!tote) return (
    <div className="page-loading">
      <div className="loader-dots">
        <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      </div>
      <span>{t('common.loading')}</span>
    </div>
  );

  return (
    <div className="page">
      <div className="app-header">
        <div className="app-logo">
          <div className="logo-icon"><ToteIcon size={24} /></div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">{t('share.subtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="theme-toggle" onClick={onToggleTheme}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <LangToggle />
        </div>
      </div>

      <div className="detail-header">
        <div className="detail-tag">
          <span style={{ color: 'var(--text-3)' }}>👁 {t('share.sharedTote')}</span>
        </div>
        <div className="detail-title">{tote.label}</div>
        {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
        {tote.tags?.length > 0 && (
          <div className="tote-tags" style={{ marginTop: 8 }}>
            {tote.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
          </div>
        )}
        <div className="detail-stats">
          <div className="stat">
            <div className="stat-val">{items.length}</div>
            <div className="stat-label">{t('common.items')}</div>
          </div>
          <div className="stat">
            <div className="stat-val">{totalQty}</div>
            <div className="stat-label">{t('share.totalQty')}</div>
          </div>
          {tote.tags?.length > 0 && (
            <div className="stat">
              <div className="stat-val">{tote.tags.length}</div>
              <div className="stat-label">{t('share.categories')}</div>
            </div>
          )}
        </div>
        {updatedText && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 14 }}>{updatedText}</div>
        )}
      </div>

      <div className="section">
        <div className="section-label">{t('share.itemsHeader')} ({items.length})</div>

        {items.length > 5 && (
          <div className="search-wrap" style={{ marginBottom: 14 }}>
            <span className="search-icon">⌕</span>
            <input
              className="search-input"
              placeholder={t('share.searchItems')}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
          </div>
        )}

        {items.length === 0 ? (
          <div className="empty-items">{t('detail.noItemsView')}</div>
        ) : filtered.length === 0 ? (
          <div className="empty-items">{t('share.noMatches', { q: search })}</div>
        ) : (
          filtered.map(item => (
            <div key={item.id} className="item-row">
              <div className="qty-tag">×{item.quantity}</div>
              <div style={{ flex: 1 }}>
                <div className="item-name">{item.name}</div>
                {item.notes && <div className="item-notes">{item.notes}</div>}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24, padding: '8px 0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, opacity: 0.6 }}>
          <ToteIcon size={16} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{t('share.poweredBy')}</span>
        </div>
      </div>
    </div>
  );
}
