import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ToteList() {
  const [totes, setTotes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ label: '', location: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchTotes(); }, []);

  async function fetchTotes() {
    const res = await fetch('/api/totes');
    setTotes(await res.json());
  }

  async function createTote(e) {
    e.preventDefault();
    if (!form.label.trim()) return;
    setLoading(true);
    await fetch('/api/totes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ label: '', location: '' });
    setShowModal(false);
    setLoading(false);
    fetchTotes();
  }

  const totalItems = totes.reduce((a, t) => a + (t.item_count || 0), 0);

  return (
    <div className="page">
      <div className="app-header">
        <div className="app-logo">
          <div className="logo-icon">📦</div>
          <div>
            <div className="app-title">Tote Tracker</div>
            <div className="app-subtitle">INVENTORY MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          + NEW TOTE
        </button>
      </div>

      {totes.length > 0 && (
        <div className="status-bar">
          <div className="status-dot" />
          <div className="status-item">TOTES: <span className="status-val">{totes.length}</span></div>
          <div className="status-item">ITEMS: <span className="status-val">{totalItems}</span></div>
          <div className="status-item">STATUS: <span className="status-val">ONLINE</span></div>
        </div>
      )}

      {totes.length === 0 ? (
        <div className="empty">
          <span className="empty-icon">📦</span>
          <div className="empty-title">No Totes Registered</div>
          <div className="empty-sub">{'// Create your first tote and use AI\n// to automatically catalog its contents'}</div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + CREATE FIRST TOTE
          </button>
        </div>
      ) : (
        <div className="tote-grid">
          {totes.map((t, i) => (
            <div key={t.id} className="tote-card" onClick={() => navigate(`/tote/${t.id}`)}>
              <div className="tote-card-inner">
                <div className="tote-num">{String(i + 1).padStart(2, '0')}</div>
                <div className="tote-card-content">
                  <div className="tote-card-label">{t.label}</div>
                  <div className="tote-card-loc">
                    {t.location ? `📍 ${t.location}` : '— NO LOCATION SET'}
                  </div>
                </div>
                <div className="tote-card-right">
                  <div className="item-count">{t.item_count}</div>
                  <div className="item-count-label">ITEMS</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Register New Tote</div>
            <form onSubmit={createTote}>
              <div className="field">
                <label>Tote Label *</label>
                <input
                  className="input input-full"
                  placeholder="e.g. KITCHEN SUPPLIES"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Storage Location</label>
                <input
                  className="input input-full"
                  placeholder="e.g. GARAGE SHELF 3"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>CANCEL</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'CREATING...' : 'REGISTER TOTE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
