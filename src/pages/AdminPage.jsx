import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';
import '../index.css';

const ROLES = ['user', 'treasurer', 'admin'];

const isPaid = (s) => ['paid', 'completed'].includes(s?.toLowerCase());
const fmtMoney = (n) => `R ${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = d?.toDate ? d.toDate() : new Date(d);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

/* ── CSV export ── */
function exportCSV(contributions) {
  const rows = [
    ['StokvelHub — Platform Report'],
    [`Generated: ${new Date().toLocaleString('en-ZA')}`],
    [],
    ['Member', 'Group', 'Amount (ZAR)', 'Payment Method', 'Type', 'Status', 'Date'],
    ...contributions.map(c => [
      c.member || c.userId || '—',
      c.groupId || '—',
      c.amount,
      c.paymentMethod || '—',
      c.type || 'monthly',
      c.status || 'pending',
      c.date || '—',
    ]),
    [],
    ['Total Collected', contributions.filter(c => isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0)],
    ['Total Pending', contributions.filter(c => !isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0)],
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stokvel-admin-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── PDF export ── */
function exportPDF(contributions, stats, groupCount, userCount) {
  const rows = contributions.slice(0, 200).map(c => `
    <tr>
      <td>${c.member || c.userId || '—'}</td>
      <td>${c.groupId || '—'}</td>
      <td style="text-align:right">${fmtMoney(c.amount)}</td>
      <td style="text-transform:capitalize">${c.paymentMethod || '—'}</td>
      <td>
        <span style="background:${isPaid(c.status) ? '#dcfce7' : '#fef9c3'};
                     color:${isPaid(c.status) ? '#166534' : '#854d0e'};
                     padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600">
          ${c.status || 'pending'}
        </span>
      </td>
      <td>${c.date || '—'}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>StokvelHub Admin Report</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;padding:40px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;border-bottom:3px solid #1e4a2a;padding-bottom:18px}
    .brand{font-size:22px;font-weight:800;color:#1e4a2a}.brand span{color:#f4b942}
    .meta{font-size:12px;color:#666;text-align:right}
    .stats{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px}
    .stat{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:center}
    .stat-val{font-size:16px;font-weight:800;color:#1e4a2a}.stat-label{font-size:10px;color:#666;margin-top:3px}
    h2{font-size:15px;color:#1e4a2a;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{background:#1e4a2a;color:white;padding:8px 10px;text-align:left;font-weight:600}
    td{padding:8px 10px;border-bottom:1px solid #e5e7eb}
    tr:nth-child(even) td{background:#f9fafb}
    .footer{margin-top:24px;font-size:10px;color:#999;text-align:center;border-top:1px solid #e5e7eb;padding-top:12px}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="brand">Stokvel<span>Hub</span></div>
      <div style="font-size:13px;color:#444;margin-top:4px">Admin Platform Report</div>
    </div>
    <div class="meta">
      <div><strong>Administrator</strong></div>
      <div>Generated: ${new Date().toLocaleString('en-ZA')}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-val">${fmtMoney(stats.totalCollected)}</div><div class="stat-label">Total Collected</div></div>
    <div class="stat"><div class="stat-val">${fmtMoney(stats.totalPending)}</div><div class="stat-label">Pending</div></div>
    <div class="stat"><div class="stat-val">${contributions.length}</div><div class="stat-label">Transactions</div></div>
    <div class="stat"><div class="stat-val">${groupCount}</div><div class="stat-label">Groups</div></div>
    <div class="stat"><div class="stat-val">${userCount}</div><div class="stat-label">Members</div></div>
  </div>
  <h2>All Contributions ${contributions.length > 200 ? '(first 200 shown)' : ''}</h2>
  <table>
    <thead><tr><th>Member</th><th>Group</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">StokvelHub — Empowering Communities Through Collective Savings</div>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

function AdminPage() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [updating, setUpdating]       = useState(null);
  const [search, setSearch]           = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  const navigate = useNavigate();

  /* ── reports state ── */
  const [activeTab, setActiveTab]           = useState('users');
  const [contributions, setContributions]   = useState([]);
  const [groups, setGroups]                 = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [filterStatus, setFilterStatus]     = useState('all');
  const [filterGroup, setFilterGroup]       = useState('all');
  const [sortField, setSortField]           = useState('date');
  const [sortDir, setSortDir]               = useState('desc');

  /* ── fetch users ── */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── fetch reports data when tab opens ── */
  useEffect(() => {
    if (activeTab !== 'reports') return;
    (async () => {
      setReportsLoading(true);
      try {
        const [contribSnap, groupsSnap] = await Promise.all([
          getDocs(collection(db, 'Contributions')),
          getDocs(collection(db, 'groups')),
        ]);
        setContributions(contribSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch reports data:', err);
      } finally {
        setReportsLoading(false);
      }
    })();
  }, [activeTab]);

  /* ── stats ── */
  const totalCollected = contributions.filter(c => isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0);
  const totalPending   = contributions.filter(c => !isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0);
  const paidCount      = contributions.filter(c => isPaid(c.status)).length;
  const compliance     = contributions.length ? (paidCount / contributions.length) * 100 : 0;

  /* ── per-group breakdown ── */
  const groupBreakdown = groups.map(g => {
    const gc = contributions.filter(c => c.groupId === g.id);
    const collected = gc.filter(c => isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0);
    const pending   = gc.filter(c => !isPaid(c.status)).reduce((s, c) => s + Number(c.amount), 0);
    return { ...g, transactionCount: gc.length, collected, pending };
  }).sort((a, b) => b.collected - a.collected);

  /* ── unique groups for filter ── */
  const groupIds = ['all', ...new Set(contributions.map(c => c.groupId).filter(Boolean))];

  /* ── filtered + sorted table ── */
  const filtered = contributions
    .filter(c => filterStatus === 'all' ? true : (filterStatus === 'paid' ? isPaid(c.status) : !isPaid(c.status)))
    .filter(c => filterGroup === 'all' ? true : c.groupId === filterGroup)
    .sort((a, b) => {
      const va = sortField === 'amount' ? Number(a.amount) : new Date(a.date || 0);
      const vb = sortField === 'amount' ? Number(b.amount) : new Date(b.date || 0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const handleRoleChange = async (userId, newRole, currentRole) => {
    const userName = users.find(u => u.id === userId)?.name || 'this user';
    if (!window.confirm(`Change "${userName}" from "${currentRole}" to "${newRole}"?\n\nThis will affect their access immediately.`)) return;
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch {
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const filtered_users = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { setCurrentPage(1); }, [search]);

  const counts = {
    total:     users.length,
    admin:     users.filter(u => u.role === 'admin').length,
    treasurer: users.filter(u => u.role === 'treasurer').length,
    user:      users.filter(u => u.role === 'user').length,
  };

  /* ── shared styles ── */
  const tabBtn = (id) => ({
    padding: '0.55rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.88rem',
    background: activeTab === id ? '#1e4a2a' : 'transparent',
    color: activeTab === id ? 'white' : '#555',
    transition: 'all .2s',
  });

  const pill = (active) => ({
    padding: '0.35rem 1rem', borderRadius: '8px', border: '1px solid #ddd',
    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
    background: active ? '#1e4a2a' : 'white',
    color: active ? 'white' : '#555', transition: 'all .15s',
  });

  const th = (field) => ({
    padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem',
    textTransform: 'uppercase', letterSpacing: '0.07em', color: '#777',
    fontWeight: 700, borderBottom: '2px solid #e5e7eb',
    cursor: field ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap',
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Manage users, assign roles, and oversee all stokvel groups.</p>
        </div>

        {/* stat cards */}
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

        {/* quick actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/create-group')}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            Create group
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/configure-group')}>Configure group</button>
        </div>

        {/* tab bar */}
        <div style={{ display: 'flex', gap: '0.4rem', background: '#efefef', borderRadius: '10px', padding: '0.3rem', marginBottom: '2rem', width: 'fit-content' }}>
          <button style={tabBtn('users')}   onClick={() => setActiveTab('users')}>👥 User Management</button>
          <button style={tabBtn('reports')} onClick={() => setActiveTab('reports')}>📊 Platform Reports</button>
        </div>

        {/* ── USER MANAGEMENT TAB ── */}
        {activeTab === 'users' && (
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
            ) : filtered_users.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No users found.</p>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Joined</th><th>Current role</th><th>Change role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const totalPages = Math.ceil(filtered_users.length / usersPerPage);
                        const startIndex = (currentPage - 1) * usersPerPage;
                        return filtered_users.slice(startIndex, startIndex + usersPerPage).map(u => (
                          <tr key={u.id}>
                            <td style={{ fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue-light)', color: 'var(--blue-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                                  {(u.name || u.email || '?')[0].toUpperCase()}
                                </div>
                                {u.name || '—'}
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{u.email}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                              {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </td>
                            <td>
                              <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'treasurer' ? 'badge-warning' : 'badge-info'}`}>
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
                                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                              </select>
                              {updating === u.id && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Saving…</span>}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const totalPages = Math.ceil(filtered_users.length / usersPerPage);
                  if (totalPages <= 1) return null;
                  return (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                      <button className="btn btn-outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.5rem 1rem' }}>← Previous</button>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {currentPage} of {totalPages}</span>
                      <button className="btn btn-outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.5rem 1rem' }}>Next →</button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab === 'reports' && (
          <>
            {reportsLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#1e4a2a' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <p style={{ fontWeight: 600 }}>Loading platform data…</p>
              </div>
            ) : (
              <>
                {/* platform stat cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.1rem', marginBottom: '1.8rem' }}>
                  {[
                    { icon: '💰', label: 'Total Collected', value: fmtMoney(totalCollected), accent: '#1e4a2a' },
                    { icon: '⏳', label: 'Pending',          value: fmtMoney(totalPending),   accent: '#f59e0b' },
                    { icon: '📋', label: 'Transactions',     value: contributions.length,      accent: '#6366f1' },
                    { icon: '🏘️', label: 'Groups',           value: groups.length,             accent: '#0ea5e9' },
                    { icon: '🎯', label: 'Compliance',        value: `${Math.round(compliance)}%`, accent: compliance >= 80 ? '#059669' : '#ef4444' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'white', borderRadius: '14px', padding: '1.3rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderTop: `4px solid ${s.accent}` }}>
                      <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{s.icon}</div>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.accent, margin: '0.2rem 0' }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* per-group breakdown */}
                <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.8rem' }}>
                  <h3 style={{ margin: '0 0 1.2rem', color: '#1e4a2a', fontSize: '1rem' }}>Per-Group Breakdown</h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr>
                          {['Group', 'Transactions', 'Collected', 'Pending'].map(h => (
                            <th key={h} style={th(null)}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupBreakdown.length === 0 && (
                          <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#ccc' }}>No group data.</td></tr>
                        )}
                        {groupBreakdown.map((g, i) => (
                          <tr key={g.id} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{g.groupName || g.id}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#777' }}>{g.transactionCount}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1e4a2a' }}>{fmtMoney(g.collected)}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#f59e0b', fontWeight: 600 }}>{fmtMoney(g.pending)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* all contributions table */}
                <div style={{ background: 'white', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '1.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
                    <h3 style={{ margin: 0, color: '#1e4a2a', fontSize: '1rem' }}>
                      All Contributions <span style={{ color: '#bbb', fontWeight: 400, fontSize: '0.85rem' }}>({filtered.length} of {contributions.length})</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      {['all', 'paid', 'pending'].map(s => (
                        <button key={s} style={pill(filterStatus === s)} onClick={() => setFilterStatus(s)}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                      ))}
                      {groupIds.length > 2 && (
                        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
                          style={{ padding: '0.35rem 0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.82rem', cursor: 'pointer', background: 'white', color: '#555' }}>
                          {groupIds.map(g => <option key={g} value={g}>{g === 'all' ? 'All Groups' : g}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                      <thead>
                        <tr>
                          <th style={th(null)}>Member</th>
                          <th style={th(null)}>Group</th>
                          <th style={th('amount')} onClick={() => toggleSort('amount')}>Amount {sortField === 'amount' ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ color: '#ccc' }}>⇅</span>}</th>
                          <th style={th(null)}>Method</th>
                          <th style={th('date')} onClick={() => toggleSort('date')}>Date {sortField === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : <span style={{ color: '#ccc' }}>⇅</span>}</th>
                          <th style={th(null)}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: '#ccc' }}>No contributions match your filters.</td></tr>
                        )}
                        {filtered.map((c, i) => (
                          <tr key={c.id} style={{ background: i % 2 === 0 ? '#fafafa' : 'white' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.member || c.userId || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#888', fontSize: '0.82rem' }}>{c.groupId || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#1e4a2a' }}>{fmtMoney(c.amount)}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#888', textTransform: 'capitalize' }}>{c.paymentMethod || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem', color: '#666' }}>{c.date || '—'}</td>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <span style={{ background: isPaid(c.status) ? '#dcfce7' : '#fef9c3', color: isPaid(c.status) ? '#166534' : '#854d0e', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700 }}>
                                {c.status || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filtered.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2rem', padding: '1rem 1rem 0', borderTop: '1px solid #f3f4f6', fontSize: '0.85rem', color: '#555', marginTop: '0.5rem' }}>
                      <span>Showing <strong>{filtered.length}</strong> records</span>
                      <span>Filtered total: <strong style={{ color: '#1e4a2a' }}>{fmtMoney(filtered.reduce((s, c) => s + Number(c.amount), 0))}</strong></span>
                    </div>
                  )}
                </div>

                {/* export panel */}
                <div style={{ background: 'linear-gradient(135deg, #1e4a2a 0%, #2c6e2f 100%)', borderRadius: '14px', padding: '1.8rem', color: 'white' }}>
                  <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem' }}>📤 Export Platform Report</h3>
                  <p style={{ margin: '0 0 1.3rem', opacity: 0.8, fontSize: '0.88rem' }}>
                    Download the full platform contribution data — exports respect current filters.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => exportCSV(filtered)} style={{ background: '#f4b942', color: '#1a1a1a', border: 'none', borderRadius: '10px', padding: '0.65rem 1.3rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                      ⬇ Export CSV
                    </button>
                    <button onClick={() => exportPDF(filtered, { totalCollected, totalPending }, groups.length, users.length)} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '0.65rem 1.3rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                      🖨 Export PDF
                    </button>
                  </div>
                  <p style={{ margin: '1rem 0 0', opacity: 0.5, fontSize: '0.75rem' }}>
                    CSV opens in Excel / Google Sheets. PDF uses browser print — save as PDF from there.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminPage;