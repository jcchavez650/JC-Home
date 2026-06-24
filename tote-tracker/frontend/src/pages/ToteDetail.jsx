import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const s = {
  container: { maxWidth: 960, margin: '0 auto', padding: '24px 16px' },
  back: { color: '#3b82f6', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 6 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { fontSize: 26, fontWeight: 700, color: '#f8fafc' },
  location: { color: '#64748b', fontSize: 14, marginTop: 4 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 },
  section: { background: '#1e293b', borderRadius: 12, padding: 20, border: '1px solid #334155', marginBottom: 20 },
  sectionTitle: { fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' },
  btn: { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSm: { background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  btnDanger: { background: '#7f1d1d', color: '#fca5a5', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer' },
  itemRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b' },
  itemName: { flex: 1, color: '#f1f5f9' },
  qty: { background: '#0f172a', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#94a3b8', minWidth: 32, textAlign: 'center' },
  notes: { fontSize: 12, color: '#64748b', marginTop: 2 },
  uploadArea: { border: '2px dashed #334155', borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s' },
  uploading: { textAlign: 'center', padding: 24, color: '#94a3b8' },
  spinner: { display: 'inline-block', width: 28, height: 28, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  photo: { width: '100%', borderRadius: 8, marginBottom: 8, objectFit: 'cover', maxHeight: 200 },
  qrBox: { textAlign: 'center' },
  addItemRow: { display: 'flex', gap: 8, marginTop: 12 },
  input: { flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 14 },
  tag: { background: '#1d4ed8', color: '#bfdbfe', borderRadius: 6, padding: '3px 8px', fontSize: 11, marginLeft: 8 },
};

export default function ToteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tote, setTote] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [dragOver, setDragOver] = useState(false);
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
      if (res.ok) await fetchTote();
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

  if (!tote) return <div style={{ padding: 40, color: '#64748b' }}>Loading...</div>;

  return (
    <div style={s.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.back} onClick={() => navigate('/')}>← Back to all totes</div>

      <div style={s.header}>
        <div>
          <div style={s.title}>{tote.label}</div>
          <div style={s.location}>{tote.location || 'No location set'}</div>
        </div>
        <button style={{ ...s.btn, background: '#7f1d1d', color: '#fca5a5' }} onClick={deleteTote}>
          Delete Tote
        </button>
      </div>

      <div style={s.grid}>
        {/* Left column */}
        <div>
          {/* Photo upload */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Add Photo & AI Scan</div>
            {uploading ? (
              <div style={s.uploading}>
                <div style={s.spinner} />
                <div style={{ marginTop: 12 }}>Analyzing with AI...</div>
              </div>
            ) : (
              <>
                <div
                  style={{ ...s.uploadArea, borderColor: dragOver ? '#3b82f6' : '#334155' }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  onClick={() => fileRef.current.click()}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
                  <div style={{ color: '#94a3b8', marginBottom: 8 }}>Drop a photo here or click to upload</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>AI will identify all items in the tote</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
                <button
                  style={{ ...s.btn, marginTop: 12, width: '100%', background: '#1d4ed8' }}
                  onClick={() => cameraRef.current.click()}
                >
                  📷 Use Camera
                </button>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && analyzePhoto(e.target.files[0])} />
              </>
            )}
          </div>

          {/* Items list */}
          <div style={s.section}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={s.sectionTitle}>Items ({tote.items?.length || 0})</div>
            </div>

            {tote.items?.length === 0 && (
              <div style={{ color: '#475569', textAlign: 'center', padding: '20px 0', fontSize: 14 }}>
                No items yet. Take a photo or add manually.
              </div>
            )}

            {tote.items?.map(item => (
              <div key={item.id} style={s.itemRow}>
                <div style={s.qty}>{item.quantity}</div>
                <div style={{ flex: 1 }}>
                  <div style={s.itemName}>{item.name}</div>
                  {item.notes && <div style={s.notes}>{item.notes}</div>}
                </div>
                <button style={s.btnDanger} onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))}

            <form onSubmit={addItem} style={s.addItemRow}>
              <input
                style={s.input}
                placeholder="Add item manually..."
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
              />
              <button type="submit" style={s.btn}>Add</button>
            </form>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* QR Code */}
          <div style={{ ...s.section, ...s.qrBox }}>
            <div style={s.sectionTitle}>QR Code</div>
            {tote.qr_code && (
              <>
                <img src={tote.qr_code} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 8 }} />
                <div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Scan to view tote contents</div>
                <a
                  href={tote.qr_code}
                  download={`tote-${tote.label}-qr.png`}
                  style={{ ...s.btn, display: 'inline-block', marginTop: 12, textDecoration: 'none', fontSize: 13 }}
                >
                  Download QR
                </a>
              </>
            )}
          </div>

          {/* Photos */}
          <div style={s.section}>
            <div style={s.sectionTitle}>Photos ({tote.photos?.length || 0})</div>
            {tote.photos?.length === 0 && (
              <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No photos yet</div>
            )}
            {tote.photos?.map(photo => (
              <div key={photo.id}>
                <img
                  src={`/uploads/${photo.filename}`}
                  alt="Tote photo"
                  style={s.photo}
                  onError={e => { e.target.style.display = 'none'; }}
                />
                <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>
                  {new Date(photo.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
