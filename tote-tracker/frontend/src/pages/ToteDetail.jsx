import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ToteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tote, setTote] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [tab, setTab] = useState('items');
  const fileRef = useRef();
  const cameraRef = useRef();

  useEffect(() => { fetchTote(); }, [id]);

  async function fetchTote() {
    const res = await fetch(`/api/totes/${id}`);
    if (res.ok) setTote(await res.json());
  }

  async function analyzePhoto(file) {
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await fetch(`/api/analyze/${id}`, { method: 'POST', body: fd });
      if (res.ok) { await fetchTote(); setTab('items'); }
      else {
        const err = await res.json();
        alert('Analysis failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
    setUploading(false);
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.trim()) return;
    await fetch(`/api/totes/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newItem.trim() }),
    });
    setNewItem('');
    fetchTote();
  }

  async function deleteItem(itemId) {
    await fetch(`/api/totes/${id}/items/${itemId}`, { method: 'DELETE' });
    fetchTote();
  }

  async function deleteTote() {
    if (!confirm('Delete this tote and all its contents?')) return;
    await fetch(`/api/totes/${id}`, { method: 'DELETE' });
    navigate('/');
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) analyzePhoto(file);
  }

  if (!tote) return (
    <div className="page-loading">
      <div className="spinner-ring" />
      Loading…
    </div>
  );

  return (
    <>
      <div className="bg-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
      </div>

      <div className="page">
        <div className="back-nav" onClick={() => navigate('/')}>
          ← All Totes
        </div>

        <div className="detail-header">
          <div className="detail-title">{tote.label}</div>
          {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
          <div className="detail-stats">
            {tote.items?.length > 0 && (
              <span className="badge badge-accent">{tote.items.length} item{tote.items.length !== 1 ? 's' : ''}</span>
            )}
            {tote.photos?.length > 0 && (
              <span className="badge badge-green">{tote.photos.length} photo{tote.photos.length !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* AI Scanner */}
        <div className="camera-section">
          <div className="section-label" style={{ marginBottom: 14, color: 'rgba(165,180,252,0.7)' }}>
            ✦ AI Scanner
          </div>
          {uploading ? (
            <div className="analyzing">
              <div className="spinner-ring" />
              <div className="analyzing-title">Scanning with AI…</div>
              <div className="analyzing-sub">Identifying every item in your tote</div>
            </div>
          ) : (
            <>
              <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
                📷  Scan Tote with Camera
              </button>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment"
                style={{ display: 'none' }}
                onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
              <div
                className={`upload-area${dragOver ? ' drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current.click()}
              >
                <div className="upload-icon">🖼️</div>
                <div className="upload-text">Upload from photo library</div>
                <div className="upload-hint">AI will identify and list everything</div>
              </div>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'items', label: `Items${tote.items?.length ? ` · ${tote.items.length}` : ''}` },
            { key: 'qr', label: 'QR Code' },
            { key: 'photos', label: `Photos${tote.photos?.length ? ` · ${tote.photos.length}` : ''}` },
          ].map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Items tab */}
        {tab === 'items' && (
          <div className="glass-card section">
            {tote.items?.length === 0 ? (
              <div className="empty-items">
                Scan a photo above to auto-detect items, or add manually below
              </div>
            ) : (
              tote.items.map(item => (
                <div key={item.id} className="item-row">
                  <div className="qty-pill">×{item.quantity}</div>
                  <div style={{ flex: 1 }}>
                    <div className="item-name">{item.name}</div>
                    {item.notes && <div className="item-notes">{item.notes}</div>}
                  </div>
                  <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
                </div>
              ))
            )}
            <form onSubmit={addItem} className="add-item-row">
              <input
                className="input"
                placeholder="Add item manually…"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm">Add</button>
            </form>
          </div>
        )}

        {/* QR tab */}
        {tab === 'qr' && (
          <div className="glass-card section qr-box">
            {tote.qr_code && (
              <>
                <div className="qr-wrap">
                  <img src={tote.qr_code} alt="QR Code" className="qr-img" />
                </div>
                <div className="qr-label">Scan to instantly view tote contents</div>
                <a
                  href={tote.qr_code}
                  download={`tote-${tote.label}-qr.png`}
                  className="btn btn-ghost btn-full"
                  style={{ textDecoration: 'none' }}
                >
                  ↓ Download QR Code
                </a>
              </>
            )}
          </div>
        )}

        {/* Photos tab */}
        {tab === 'photos' && (
          <div className="glass-card section">
            {tote.photos?.length === 0 ? (
              <div className="empty-items">No photos yet — scan your tote above</div>
            ) : (
              <div className="photo-grid">
                {tote.photos.map(photo => (
                  <div key={photo.id}>
                    <img
                      src={`/uploads/${photo.filename}`}
                      alt="Tote photo"
                      className="photo-thumb"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <div className="photo-date">{new Date(photo.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 8 }}>
          <button className="btn btn-danger btn-full btn-sm" onClick={deleteTote}>
            Delete Tote
          </button>
        </div>
      </div>
    </>
  );
}
