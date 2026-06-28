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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div className="page">
      <div className="back-nav" onClick={() => navigate('/')}>
        ← All Totes
      </div>

      <div className="detail-header">
        <div className="detail-title">{tote.label}</div>
        {tote.location && (
          <div className="detail-loc"><span>📍</span> {tote.location}</div>
        )}
      </div>

      {/* Camera / AI Scan */}
      <div className="camera-section">
        <div className="section-title" style={{ marginBottom: 14 }}>✦ AI Scanner</div>
        {uploading ? (
          <div className="analyzing">
            <div className="spinner-wrap"><div className="spinner" /></div>
            <div className="analyzing-title">Analyzing with AI...</div>
            <div className="analyzing-sub">Identifying all items in your tote</div>
          </div>
        ) : (
          <>
            <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
              📷  Take Photo to Scan
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
              <div className="upload-text">Upload from gallery</div>
              <div className="upload-hint">AI identifies every item automatically</div>
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
          { key: 'items', label: `Items ${tote.items?.length ? `(${tote.items.length})` : ''}` },
          { key: 'qr', label: 'QR Code' },
          { key: 'photos', label: `Photos ${tote.photos?.length ? `(${tote.photos.length})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {tab === 'items' && (
        <div className="section">
          <div className="items-list">
            {tote.items?.length === 0 && (
              <div className="empty-items">
                No items yet — scan a photo or add manually
              </div>
            )}
            {tote.items?.map(item => (
              <div key={item.id} className="item-row">
                <div className="qty-badge">×{item.quantity}</div>
                <div style={{ flex: 1 }}>
                  <div className="item-name">{item.name}</div>
                  {item.notes && <div className="item-notes">{item.notes}</div>}
                </div>
                <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
          <form onSubmit={addItem} className="add-item-row">
            <input
              className="input"
              placeholder="Add item manually..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Add</button>
          </form>
        </div>
      )}

      {/* QR */}
      {tab === 'qr' && (
        <div className="section qr-box">
          {tote.qr_code && (
            <>
              <img src={tote.qr_code} alt="QR Code" className="qr-img" />
              <div className="qr-label">Scan to view tote contents</div>
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

      {/* Photos */}
      {tab === 'photos' && (
        <div className="section">
          {tote.photos?.length === 0 && (
            <div className="empty-items">No photos yet</div>
          )}
          <div className="photo-grid">
            {tote.photos?.map(photo => (
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
        </div>
      )}

      <div style={{ marginTop: 8 }}>
        <button className="btn btn-danger btn-full btn-sm" onClick={deleteTote}>
          Delete Tote
        </button>
      </div>
    </div>
  );
}
