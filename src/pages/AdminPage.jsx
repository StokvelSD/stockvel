import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const ROLES = ['user', 'treasurer', 'admin'];

function AdminPage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole, currentRole) => {
    const userName = users.find(u => u.id === userId)?.name || 'this user';
    const confirmed = window.confirm(
      `Change "${userName}" from "${currentRole}" to "${newRole}"?\n\nThis will affect their access immediately.`
    );
    if (!confirmed) return;

    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = users.filter(u =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = {
    total:     users.length,
    admin:     users.filter(u => u.role === 'admin').length,
    treasurer: users.filter(u => u.role === 'treasurer').length,
    user:      users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Manage users, assign roles, and oversee all stokvel groups.</p>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Total users</div>
            <div className="stat-value">{counts.total}</div>
            <div className="stat-sub">Registered accounts</div>
          </div>
          <div className="stat-card accent-warn">
            <div className="stat-label">Treasurers</div>
            <div className="stat-value">{counts.treasurer}</div>
            <div className="stat-sub">With treasurer role</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Members</div>
            <div className="stat-value">{counts.user}</div>
            <div className="stat-sub">Standard users</div>
          </div>
          <div className="stat-card accent-sky">
            <div className="stat-label">Admins</div>
            <div className="stat-value">{counts.admin}</div>
            <div className="stat-sub">Admin accounts</div>
          </div>
        </div>

        {/* Quick actions - removed Browse groups button since it's in BottomNav */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/create-group')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Create group
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/configure-group')}>
            Configure group
          </button>
        </div>

        {/* User management table */}
        <div className="section-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text)' }}>
              User Management
            </span>
            <input
              className="form-control"
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '260px', padding: '0.45rem 0.8rem', fontSize: '0.875rem' }}
            />
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading users…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No users found.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Joined</th>
                    <th>Current role</th>
                    <th>Change role</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--blue-light)',
                            color: 'var(--blue-dark)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                          }}>
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          {u.name || '—'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        {u.createdAt?.toDate
                          ? u.createdAt.toDate().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-danger' :
                          u.role === 'treasurer' ? 'badge-warning' :
                          'badge-info'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}
                          value={u.role || 'user'}
                          disabled={updating === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value, u.role || 'user')}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                        {updating === u.id && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                            Saving…
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;