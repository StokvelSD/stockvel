import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import '../index.css';

const isPaidOrCompleted = (status) => ['paid', 'completed', 'confirmed'].includes((status || '').toLowerCase());

const formatTimestamp = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-ZA');
};

export default function TreasurerDashboard() {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const currentGroupId = 'group_001';

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'contributions'));
        setContributions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalCollected = contributions.filter(c => isPaidOrCompleted(c.status)).reduce((s, c) => s + Number(c.amount || 0), 0);
  const pendingCount   = contributions.filter(c => !isPaidOrCompleted(c.status)).length;
  const nextRotation   = 'May 2025';

  const handleConfirm = async (id) => {
    try {
      await updateDoc(doc(db, 'contributions', id), { status: 'paid', confirmedAt: serverTimestamp() });
      const now = new Date();
      setContributions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid', confirmedAt: { toDate: () => now } } : c));
    } catch (e) { console.error(e); alert('Failed to confirm payment.'); }
  };

  const handleFinanceAction = (e) => { e.preventDefault(); setShowFinancePanel(false); };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <h3>Syncing ledger…</h3>
    </div>
  );

  return (
    <div className="treasurer-page">
      <div className="dashboard-header">
        <h2>Treasurer Dashboard</h2>
        <p>Audit-ready contribution tracking for {currentGroupId}.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">R {totalCollected.toLocaleString()}</div>
          <div className="stat-sub">confirmed payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Records</div>
          <div className="stat-value">{contributions.length}</div>
          <div className="stat-sub">all members</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#d97706' }}>{pendingCount}</div>
          <div className="stat-sub">awaiting confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payout</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>{nextRotation}</div>
          <div className="stat-sub">rotation date</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button className="btn-primary" onClick={() => setShowFinancePanel(!showFinancePanel)}>
          Manage Finances
        </button>
        <button className="btn-secondary">Record Payout</button>
      </div>

      {showFinancePanel && (
        <div className="finance-panel">
          <h3>Circle Finances</h3>
          <form onSubmit={handleFinanceAction}>
            <div className="field">
              <label>Expense category</label>
              <div className="select-wrap">
                <select>
                  <option>Meeting venue</option>
                  <option>Emergency fund</option>
                  <option>Investment</option>
                  <option>Other</option>
                </select>
                <span className="select-arrow">⌄</span>
              </div>
            </div>
            <div className="field">
              <label>Amount (R)</label>
              <input type="number" placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-ghost" onClick={() => setShowFinancePanel(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="dashboard-card">
        <h3>All Member Contributions</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Confirmed</th>
                <th>Method</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {contributions.map(c => {
                const paid = isPaidOrCompleted(c.status);
                const confTime = formatTimestamp(c.confirmedAt);
                return (
                  <tr key={c.id}>
                    <td><strong>{c.member || c.userId || 'Unknown'}</strong></td>
                    <td>R {c.amount}</td>
                    <td style={{ color: '#64748b' }}>{c.date || '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{confTime || '—'}</td>
                    <td style={{ color: '#64748b' }}>{c.paymentMethod || '—'}</td>
                    <td>
                      <span className={`badge ${paid ? 'badge-success' : 'badge-warning'}`}>
                        {(c.status || 'pending').toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {!paid && (
                        <button className="btn-primary" style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleConfirm(c.id)}>
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}