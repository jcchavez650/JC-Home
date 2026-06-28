import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ShareView() {
  const { token } = useParams();
  const [tote, setTote] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/totes/share/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setTote)
      .catch(() => setError(true));
  }, [token]);

  if (error) return (
    <div className="page-loading">
      <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      <span style={{ marginLeft: 8 }}>TOTE NOT FOUND</span>
    </div>
  );

  if (!tote) return (
    <div className="page-loading">
      <div className="loader-dot" /><div className="loader-dot" /><div className="loader-dot" />
      <span style={{ marginLeft: 8 }}>LOADING</span>
    </div>
  );

  return (
    <div className="page">
      <div className="app-header">
        <div className="app-logo">
          <div className="logo-icon">📦</div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">Shared Manifest — View Only</div>
          </div>
        </div>
      </div>

      <div className="detail-header">
        <div className="detail-tag"><span style={{ color: 'var(--text-3)' }}>Shared Tote</span></div>
        <div className="detail-title">{tote.label}</div>
        {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
        {tote.tags?.length > 0 && (
          <div className="tote-tags" style={{ marginTop: 8 }}>
            {tote.tags.map(tag => <span key={tag} className="tote-tag">{tag}</span>)}
          </div>
        )}
        <div className="detail-stats">
          <div className="stat">
            <div className="stat-val">{tote.items?.length || 0}</div>
            <div className="stat-label">Items</div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-label">Items</div>
        {tote.items?.length === 0 ? (
          <div className="empty-items">No items logged</div>
        ) : (
          tote.items.map(item => (
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
    </div>
  );
}
