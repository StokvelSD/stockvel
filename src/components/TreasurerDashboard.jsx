import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { initiatePayout } from './initiatePayout';
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
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupDocData, setGroupDocData] = useState(null);
  const [nextRecipient, setNextRecipient] = useState(null);

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
      setGroupDocData(groupData);
      setGroupName(groupData?.groupName || groupData?.name || currentGroupId);

      const memberIds = groupData?.members || [];

      const memberDocs = await Promise.all(
        memberIds.map(id => getDoc(doc(db, 'users', id)))
      );
      const members = memberDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      const sortedMembers = members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const paymentsSnap = await getDocs(
        query(collection(db, 'payments'), where('groupId', '==', currentGroupId))
      );
      const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const payoutsSnap = await getDocs(
        query(collection(db, 'payouts'), where('groupId', '==', currentGroupId))
      );
      const payouts = payoutsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.status === 'success');

      const paidOutIds = payouts.map(p => p.userId);

      const joined = sortedMembers.map(member => {
        const payment = payments.find(p => p.userId === member.id);
        return {
          ...member,
          amount: payment?.amount ? payment.amount : null,
          status: payment?.status || 'pending',
          confirmedAt: payment?.createdAt || null,
          isPaidOut: paidOutIds.includes(member.id),
        };
      });

      setTableData(joined);

      const nextPending = sortedMembers.find(m => !paidOutIds.includes(m.id));
      setNextRecipient(nextPending);

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
  
  const expectedPot = (groupDocData?.contributionAmount || 0) * tableData.length;

  const handleInitiatePayout = async () => {
    if (!nextRecipient) return;
    setError('');
    setSuccess('');
    setPayoutLoading(true);

    try {
      await initiatePayout({
        groupId: groupId,
        amount: expectedPot,
        currentCycleId: 1 
      });

      setSuccess("Payout initiated successfully");
      setTimeout(() => {
        setShowPayoutModal(false);
        fetchDashboardData();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayoutLoading(false);
    }
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
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>{expectedPot.toLocaleString()} ZAR</div>
          <div className="stat-sub">Expected Pot</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button className="btn-primary" onClick={() => setShowPayoutModal(true)}>Record Payout</button>
      </div>

      {showPayoutModal && (
        <div className="finance-panel">
          <h3>Initiate Rotation Payout</h3>
          
          {expectedPot > totalCollected && (
            <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #f87171' }}>
              <strong>⚠️ Insufficient Funds Warning:</strong><br/>
              The expected payout (R{expectedPot}) is greater than the total collected funds (R{totalCollected}). In a real-world scenario, this transaction would bounce, but it is enabled for testing.
            </div>
          )}

          {nextRecipient ? (
            <>
              <p>Next in rotation: <strong>{nextRecipient.name || nextRecipient.email}</strong></p>
              <p>Amount to disburse: <strong>R {expectedPot.toLocaleString()}</strong></p>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button 
                  className="btn-primary" 
                  onClick={handleInitiatePayout}
                  disabled={payoutLoading}
                >
                  {payoutLoading ? "Processing..." : "Confirm Payout"}
                </button>
                <button 
                  className="btn-ghost" 
                  onClick={() => { setShowPayoutModal(false); setError(''); setSuccess(''); }}
                >
                  Cancel
                </button>
              </div>
              {error && <p style={{ color: "red", marginTop: '0.5rem' }}>{error}</p>}
              {success && <p style={{ color: "green", marginTop: '0.5rem' }}>{success}</p>}
            </>
          ) : (
            <>
              <p>All members have been paid out for this cycle.</p>
              <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Close</button>
            </>
          )}
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
                <th>Contribution</th>
                <th>Payout Status</th>
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
                    <td>
                      <span style={{ backgroundColor: member.isPaidOut ? '#dcfce7' : '#f1f5f9', color: member.isPaidOut ? '#166534' : '#475569', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {member.isPaidOut ? 'DISBURSED' : 'WAITING'}
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