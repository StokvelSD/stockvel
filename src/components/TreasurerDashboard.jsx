import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

const isPaidOrCompleted = (status) => ['paid', 'completed', 'confirmed'].includes((status || '').toLowerCase());

const formatTimestamp = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-ZA');
};

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const [tableData, setTableData] = useState([]);
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFinancePanel, setShowFinancePanel] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const groupIds = userDoc.data()?.groups || [];
      if (groupIds.length === 0) {
        setLoading(false);
        return;
      }

      const currentGroupId = groupIds[0];
      setGroupId(currentGroupId);

      const groupDoc = await getDoc(doc(db, 'groups', currentGroupId));
      const groupData = groupDoc.data();
      setGroupName(groupData?.groupName || groupData?.name || currentGroupId);

      const memberIds = groupData?.members || [];

      const memberDocs = await Promise.all(
        memberIds.map(id => getDoc(doc(db, 'users', id)))
      );
      const members = memberDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      const paymentsSnap = await getDocs(
        query(collection(db, 'payments'), where('groupId', '==', currentGroupId))
      );
      const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const joined = members.map(member => {
        const payment = payments.find(p => p.userId === member.id);
        return {
          ...member,
          amount: payment?.amount || null,
          status: payment?.status || 'unpaid',
          confirmedAt: payment?.createdAt || null,
        };
      });

      setTableData(joined);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = tableData
    .filter(m => isPaidOrCompleted(m.status))
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const pendingCount = tableData.filter(m => !isPaidOrCompleted(m.status)).length;

  const handleFinanceAction = (e) => {
    e.preventDefault();
    setShowFinancePanel(false);
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <h3>Syncing ledger…</h3>
    </div>
  );

  if (!groupId) return (
    <div className="treasurer-page">
      <div className="dashboard-header">
        <h2>Treasurer Dashboard</h2>
        <p>You are not assigned to any group yet.</p>
      </div>
    </div>
  );

  return (
    <div className="treasurer-page">
      <div className="dashboard-header">
        <h2>Treasurer Dashboard</h2>
        <p>Managing: <strong>{groupName}</strong></p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">R {totalCollected.toLocaleString()}</div>
          <div className="stat-sub">confirmed payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Members</div>
          <div className="stat-value">{tableData.length}</div>
          <div className="stat-sub">in this group</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#d97706' }}>{pendingCount}</div>
          <div className="stat-sub">awaiting payment</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payout</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>May 2026</div>
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
        <h3>All Group Members</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(member => {
                const paid = isPaidOrCompleted(member.status);
                const confTime = formatTimestamp(member.confirmedAt);

                return (
                  <tr key={member.id}>
                    <td><strong>{member.name || member.email || 'Unknown'}</strong></td>
                    <td style={{ color: '#64748b' }}>{member.email || '—'}</td>
                    <td>{member.amount ? `R ${member.amount}` : '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{confTime || '—'}</td>
                    <td>
                      <span className={`badge ${paid ? 'badge-success' : 'badge-warning'}`}>
                        {member.status.toUpperCase()}
                      </span>
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