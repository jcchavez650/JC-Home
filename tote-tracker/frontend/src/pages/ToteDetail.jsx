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
    if (!confirm('DELETE THIS TOTE AND ALL CONTENTS?')) return;
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
      <div className="loader-dot" />
      <div className="loader-dot" />
      <div className="loader-dot" />
      <span style={{ marginLeft: 8 }}>LOADING</span>
    </div>
  );

  return (
    <div className="page">
      <div className="back-nav" onClick={() => navigate('/')}>
        ← BACK TO INVENTORY
      </div>

      <div className="detail-header">
        <div className="detail-tag">
          <span style={{ color: 'var(--text-3)' }}>TOTE ID:</span>
          {id.slice(0, 8).toUpperCase()}
        </div>
        <div className="detail-title">{tote.label}</div>
        {tote.location && <div className="detail-loc">📍 {tote.location}</div>}
        <div className="detail-stats">
          <div className="stat">
            <div className="stat-val">{tote.items?.length || 0}</div>
            <div className="stat-label">Items</div>
          </div>
          <div className="stat">
            <div className="stat-val">{tote.photos?.length || 0}</div>
            <div className="stat-label">Photos</div>
          </div>
        </div>
      </div>

      {/* AI Scanner */}
      <div className="camera-section">
        <div className="section-label">AI SCAN</div>
        {uploading ? (
          <div className="analyzing">
            <div className="scan-animation">
              <div className="scan-icon">📦</div>
              <div className="scan-line" />
            </div>
            <div className="analyzing-title">Scanning Contents</div>
            <div className="analyzing-sub">// AI identifying all items...</div>
          </div>
        ) : (
          <>
            <button className="btn btn-camera btn-full" onClick={() => cameraRef.current.click()}>
              📷 SCAN WITH CAMERA
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
              <div className="upload-text">Upload from Library</div>
              <div className="upload-hint">// drag & drop or tap to select</div>
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
          { key: 'items', label: `MANIFEST (${tote.items?.length || 0})` },
          { key: 'qr', label: 'QR LABEL' },
          { key: 'photos', label: `PHOTOS (${tote.photos?.length || 0})` },
        ].map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {tab === 'items' && (
        <div className="section">
          <div className="section-label">ITEM MANIFEST</div>
          {tote.items?.length === 0 ? (
            <div className="empty-items">// no items logged — scan or add manually</div>
          ) : (
            tote.items.map((item, i) => (
              <div key={item.id} className="item-row">
                <div className="qty-tag">×{item.quantity}</div>
                <div style={{ flex: 1 }}>
                  <div className="item-name">{item.name}</div>
                  {item.notes && <div className="item-notes">// {item.notes}</div>}
                </div>
                <button className="delete-btn" onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))
          )}
          <form onSubmit={addItem} className="add-item-row">
            <input
              className="input"
              placeholder="Add item manually..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">ADD</button>
          </form>
        </div>
      )}

      {/* QR */}
      {tab === 'qr' && (
        <div className="section qr-box">
          <div className="section-label">TOTE QR LABEL</div>
          {tote.qr_code && (
            <>
              <div className="qr-wrap">
                <img src={tote.qr_code} alt="QR Code" className="qr-img" />
              </div>
              <div className="qr-label">// SCAN TO ACCESS TOTE MANIFEST</div>
              <a
                href={tote.qr_code}
                download={`tote-${tote.label}-qr.png`}
                className="btn btn-ghost btn-full"
                style={{ textDecoration: 'none' }}
              >
                ↓ DOWNLOAD QR LABEL
              </a>
            </>
          )}
        </div>
      )}

      {/* Photos */}
      {tab === 'photos' && (
        <div className="section">
          <div className="section-label">SCAN HISTORY</div>
          {tote.photos?.length === 0 ? (
            <div className="empty-items">// no scans on record</div>
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
          DEREGISTER TOTE
        </button>
      </div>
    </div>
  );
}
