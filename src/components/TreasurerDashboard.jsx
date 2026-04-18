import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

const isPaidOrCompleted = (status) => {
  const s = (status || '').toLowerCase();
  return s === 'paid' || s === 'completed' || s === 'confirmed';
};

const formatTimestamp = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('en-ZA');
};

export default function TreasurerDashboard() {
  const { user } = useAuth();
  const [tableData, setTableData] = useState([]);
  const [groupIds, setGroupIds] = useState([]);
  const [groupNames, setGroupNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const membersPerPage = 10;

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userGroups = userDoc.data()?.groups || [];
      if (userGroups.length === 0) {
        setLoading(false);
        return;
      }

      setGroupIds(userGroups);

      // Fetch all groups the user is a member of
      const groupDocs = await Promise.all(
        userGroups.map(id => getDoc(doc(db, 'groups', id)))
      );
      
      const groupsData = groupDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      // Build group names map
      const namesMap = {};
      groupsData.forEach(g => {
        namesMap[g.id] = g.groupName || g.name || g.id;
      });
      setGroupNames(namesMap);

      // Fetch members and payments for all groups
      const allMembers = [];
      
      for (const group of groupsData) {
        const memberIds = group.members || [];
        
        const memberDocs = await Promise.all(
          memberIds.map(id => getDoc(doc(db, 'users', id)))
        );
        const members = memberDocs
          .filter(d => d.exists())
          .map(d => ({ id: d.id, ...d.data() }));

        const paymentsSnap = await getDocs(
          query(collection(db, 'payments'), where('groupId', '==', group.id))
        );
        const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const groupName = group.groupName || group.name || group.id;
        
        members.forEach(member => {
          const payment = payments.find(p => p.userId === member.id);
          allMembers.push({
            ...member,
            groupId: group.id,
            groupName: groupName,
            amount: payment?.amount || null,
            status: payment?.status || 'unpaid',
            confirmedAt: payment?.createdAt || null,
          });
        });
      }

      setTableData(allMembers);
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

  if (groupIds.length === 0) return (
    <div className="treasurer-page">
      <div className="dashboard-header">
        <h2>Treasurer Dashboard</h2>
        <p>You are not assigned to any group yet.</p>
      </div>
    </div>
  );

  // Get the first group for the header (or show all)
  const primaryGroupName = groupNames[groupIds[0]] || 'Unknown';

  return (
    <div className="treasurer-page">
      <div className="dashboard-header">
        <h2>Treasurer Dashboard</h2>
        <p>Managing: <strong>{primaryGroupName}</strong>{groupIds.length > 1 && ` and ${groupIds.length - 1} other group(s)`}</p>
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
                <th>Group</th>
                <th>Amount Paid</th>
                <th>Payment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Sort: unpaid first (status !== paid/completed/confirmed), then by group name
                const sortedData = [...tableData].sort((a, b) => {
                  const aPaid = isPaidOrCompleted(a.status);
                  const bPaid = isPaidOrCompleted(b.status);
                  // Unpaid (false) should come before paid (true)
                  if (!aPaid && bPaid) return -1;
                  if (aPaid && !bPaid) return 1;
                  // Same payment status, sort by group name
                  return (a.groupName || '').localeCompare(b.groupName || '');
                });
                
                // Paginate
                const totalPages = Math.ceil(sortedData.length / membersPerPage);
                const startIndex = (currentPage - 1) * membersPerPage;
                const paginatedData = sortedData.slice(startIndex, startIndex + membersPerPage);
                
                return paginatedData.map(member => {
                  const paid = isPaidOrCompleted(member.status);
                  const confTime = formatTimestamp(member.confirmedAt);

                  return (
                    <tr key={member.id}>
                      <td><strong>{member.name || member.email || 'Unknown'}</strong></td>
                      <td style={{ color: '#64748b' }}>{member.email || '—'}</td>
                      <td style={{ fontSize: '0.875rem' }}>{member.groupName || '—'}</td>
                      <td>{member.amount ? `R ${member.amount}` : '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{confTime || '—'}</td>
                      <td>
                        <span className={`badge ${paid ? 'badge-success' : 'badge-warning'}`}>
                          {member.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {tableData.length > membersPerPage && (() => {
          const sortedLength = [...tableData].sort((a, b) => {
            const aPaid = isPaidOrCompleted(a.status);
            const bPaid = isPaidOrCompleted(b.status);
            if (!aPaid && bPaid) return -1;
            if (aPaid && !bPaid) return 1;
            return (a.groupName || '').localeCompare(b.groupName || '');
          }).length;
          const totalPages = Math.ceil(sortedLength / membersPerPage);
          
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn btn-outline"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.5rem 1rem' }}
              >
                ← Previous
              </button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="btn btn-outline"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.5rem 1rem' }}
              >
                Next →
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}