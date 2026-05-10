import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, getDoc, doc, query, where, updateDoc } from 'firebase/firestore';
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
  const [myGroups, setMyGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [tableData, setTableData] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [groupDocData, setGroupDocData] = useState(null);
  const [nextRecipient, setNextRecipient] = useState(null);
  const [saRates, setSaRates] = useState({ repo: 8.25, prime: 11.75 });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [payoutProjections, setPayoutProjections] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(1);

  useEffect(() => {
    if (!user) return;
    fetchSaRates();
    fetchMyGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) fetchDashboardData(selectedGroupId);
  }, [selectedGroupId]);

  const fetchSaRates = async () => {
    try {
      const response = await fetch('https://stockvel-2kvp.onrender.com/api/sarb-rates');
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      if (data.repo && data.prime) setSaRates({ repo: data.repo, prime: data.prime });
    } catch {
      setSaRates({ repo: 8.25, prime: 11.75 });
    }
  };

  const fetchMyGroups = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const groupIds = userDoc.data()?.groups || [];
      if (groupIds.length === 0) { setLoadingGroups(false); return; }

      const groupDocs = await Promise.all(groupIds.map(id => getDoc(doc(db, 'groups', id))));
      const groups = groupDocs
        .filter(d => d.exists())
        .map(d => ({ id: d.id, ...d.data() }));

      setMyGroups(groups);

      if (groups.length === 1) setSelectedGroupId(groups[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchDashboardData = async (gId) => {
    setLoadingDashboard(true);
    setTableData([]);
    setPayoutHistory([]);
    setPayoutProjections([]);
    setNextRecipient(null);
    try {
      const groupDoc = await getDoc(doc(db, 'groups', gId));
      const groupData = groupDoc.data();
      setGroupDocData(groupData);
      setGroupName(groupData?.groupName || groupData?.name || gId);

      const cycle = groupData?.currentCycle || 1;
      setCurrentCycle(cycle);

      const payoutOrder = groupData?.payoutOrder || groupData?.members || [];
      const memberDocs = await Promise.all(payoutOrder.map(id => getDoc(doc(db, 'users', id))));
      const orderedMembers = memberDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));

      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('groupId', '==', gId)));
      const allPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const currentCyclePayments = allPayments.filter(p => p.cycleId === cycle);

      const payoutsSnap = await getDocs(query(collection(db, 'payouts'), where('groupId', '==', gId)));
      const allPayouts = payoutsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const currentCyclePayouts = allPayouts.filter(p => p.cycleId === cycle && p.status === 'success');
      const allSuccessPayouts = allPayouts.filter(p => p.status === 'success');

      setPayoutHistory(allSuccessPayouts.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));

      const paidOutIdsThisCycle = currentCyclePayouts.map(p => p.userId);

      const joined = orderedMembers.map(member => {
        const payment = currentCyclePayments.find(p => p.userId === member.id);
        return {
          ...member,
          paymentId: payment?.id || null,
          amount: payment?.amount ?? null,
          status: payment?.status || 'pending',
          confirmedAt: payment?.createdAt || null,
          isPaidOut: paidOutIdsThisCycle.includes(member.id),
        };
      });

      setTableData(joined);
      setNextRecipient(orderedMembers.find(m => !paidOutIdsThisCycle.includes(m.id)) || null);

      const frequency = groupData.meetingFrequency?.toLowerCase() || 'monthly';
      const cycleStartDate = groupData.cycleStartDate?.toDate
        ? groupData.cycleStartDate.toDate()
        : new Date(groupData.cycleStartDate || groupData.createdAt);
      const basePot = (groupData.contributionAmount || 0) * orderedMembers.length;
      const monthlyRate = (saRates.prime / 100) / 12;

      const projections = orderedMembers.map((member, index) => {
        const date = new Date(cycleStartDate);
        if (frequency === 'monthly') date.setMonth(date.getMonth() + index + 1);
        else if (frequency === 'quarterly') date.setMonth(date.getMonth() + (index + 1) * 3);
        else if (frequency === 'weekly') date.setDate(date.getDate() + (index + 1) * 7);
        else date.setMonth(date.getMonth() + index + 1);
        const growth = basePot * Math.pow(1 + monthlyRate, index + 1) - basePot;
        return {
          memberId: member.id,
          memberName: member.name || member.email,
          position: index + 1,
          payoutDate: date,
          baseAmount: basePot,
          growth,
          amount: basePot + growth,
        };
      });

      setPayoutProjections(projections);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const flagAsMissed = async (member) => {
    if (!member.paymentId) { alert("Cannot flag: No payment record found."); return; }
    try {
      await updateDoc(doc(db, 'payments', member.paymentId), { status: 'missed' });
      alert(`${member.name || member.email} has been flagged for a missed contribution.`);
      fetchDashboardData(selectedGroupId);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Member", "Email", "Amount Paid", "Payment Date", "Contribution Status", "Payout Status"];
    const rows = tableData.map(m => [
      m.name || m.email, m.email,
      m.amount ? `R${m.amount}` : "0",
      formatTimestamp(m.confirmedAt) || "N/A",
      m.status.toUpperCase(),
      m.isPaidOut ? "DISBURSED" : "WAITING"
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${groupName}_Cycle${currentCycle}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalCollected = tableData.filter(m => isPaidOrCompleted(m.status)).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const complianceRate = tableData.length ? Math.round((tableData.filter(m => isPaidOrCompleted(m.status)).length / tableData.length) * 100) : 0;
  const basePotAmount = (groupDocData?.contributionAmount || 0) * tableData.length;
  let expectedPot = basePotAmount;
  let accruedInterest = 0;

  if (nextRecipient) {
    const payoutOrder = groupDocData?.payoutOrder || [];
    const index = Math.max(payoutOrder.indexOf(nextRecipient.id), 0);
    const monthlyInterestRate = (saRates.prime / 100) / 12;
    accruedInterest = basePotAmount * Math.pow(1 + monthlyInterestRate, index + 1) - basePotAmount;
    expectedPot = basePotAmount + accruedInterest;
  }

  const handleInitiatePayout = async () => {
    if (!nextRecipient) return;
    setError(''); setSuccess(''); setPayoutLoading(true);
    try {
      await initiatePayout({ groupId: selectedGroupId, amount: parseFloat(expectedPot.toFixed(2)) });
      setSuccess("Payout initiated successfully");
      setTimeout(() => { setShowPayoutModal(false); fetchDashboardData(selectedGroupId); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loadingGroups) return <div className="loading-screen"><div className="spinner" /><h3>Loading your groups…</h3></div>;

  if (!selectedGroupId) {
    return (
      <div className="treasurer-page">
        <div className="dashboard-header">
          <h2>Treasurer Dashboard</h2>
          <p>Select a group to manage</p>
        </div>
        {myGroups.length === 0 ? (
          <p style={{ color: '#64748b' }}>You are not assigned as treasurer to any group.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {myGroups.map(group => (
              <div
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                style={{
                  padding: '1.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    backgroundColor: '#1e4a2a', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1.2rem'
                  }}>
                    {(group.groupName || group.name || '?')[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600 }}>
                    Cycle {group.currentCycle || 1}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                  {group.groupName || group.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem' }}>
                  {group.members?.length || 0} members · R{group.contributionAmount}/month
                </div>
                <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>
                  Manage →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loadingDashboard) return <div className="loading-screen"><div className="spinner" /><h3>Syncing ledger…</h3></div>;

  return (
    <div className="treasurer-page">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Treasurer Dashboard</h2>
          <p>Managing: <strong>{groupName}</strong> — <span style={{ color: '#15803d' }}>Cycle {currentCycle}</span></p>
        </div>
        {myGroups.length > 1 && (
          <button
            className="btn-ghost"
            onClick={() => setSelectedGroupId(null)}
            style={{ fontSize: '0.85rem' }}
          >
            ← Switch Group
          </button>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Collected</div>
          <div className="stat-value">R {totalCollected.toLocaleString()}</div>
          <div className="stat-sub">cycle {currentCycle} payments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Compliance Rate</div>
          <div className="stat-value">{complianceRate}%</div>
          <div className="stat-sub">contribution compliance</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payout</div>
          <div className="stat-value" style={{ color: '#15803d' }}>R {expectedPot.toFixed(2)}</div>
          <div className="stat-sub" style={{ color: '#166534' }}>Includes R{accruedInterest.toFixed(2)} interest</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn-primary" onClick={() => setShowPayoutModal(true)}>Record Payout</button>
        <button className="btn-ghost" onClick={downloadCSV}>Export Report (CSV)</button>
      </div>

      {showPayoutModal && (
        <div className="finance-panel">
          <h3>Initiate Rotation Payout — Cycle {currentCycle}</h3>
          {expectedPot > totalCollected && (
            <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #f87171' }}>
              <strong>⚠️ Insufficient Funds Warning:</strong><br />
              Expected payout (R{expectedPot.toFixed(2)}) is greater than total collected (R{totalCollected}).
            </div>
          )}
          {nextRecipient ? (
            <>
              <p>Next in rotation: <strong>{nextRecipient.name || nextRecipient.email}</strong></p>
              <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>Amount to disburse: <strong>R {expectedPot.toFixed(2)}</strong></p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Base pot R{basePotAmount} + R{accruedInterest.toFixed(2)} interest.</p>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleInitiatePayout} disabled={payoutLoading}>
                  {payoutLoading ? "Processing..." : "Confirm Payout"}
                </button>
                <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Cancel</button>
              </div>
              {error && <p style={{ color: "red", marginTop: '0.5rem' }}>{error}</p>}
              {success && <p style={{ color: "green", marginTop: '0.5rem' }}>{success}</p>}
            </>
          ) : (
            <p>All members have been paid out this cycle. <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Close</button></p>
          )}
        </div>
      )}

      <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3>Member Ledger — Cycle {currentCycle}</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payout</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(member => (
                <tr key={member.id}>
                  <td><strong>{member.name || member.email}</strong></td>
                  <td>{member.amount ? `R${member.amount}` : '—'}</td>
                  <td>
                    <span className={`badge ${isPaidOrCompleted(member.status) ? 'badge-success' : member.status === 'missed' ? 'badge-danger' : 'badge-warning'}`}>
                      {member.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: member.isPaidOut ? '#166534' : '#475569' }}>
                      {member.isPaidOut ? 'DISBURSED' : 'WAITING'}
                    </span>
                  </td>
                  <td>
                    {!isPaidOrCompleted(member.status) && member.status !== 'missed' && (
                      <button className="btn-ghost" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#dc2626' }} onClick={() => flagAsMissed(member)}>
                        Flag Missed
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>
          Full Payout Schedule — Cycle {currentCycle}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          {payoutProjections.map((projection) => {
            const alreadyPaid = payoutHistory.find(p =>
              (p.userId === projection.memberId || p.memberId === projection.memberId) && p.cycleId === currentCycle
            );
            return (
              <div key={projection.memberId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: alreadyPaid ? '#2c6e2f' : '#e2e8f0',
                    color: alreadyPaid ? 'white' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem'
                  }}>
                    {projection.position}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{projection.memberName}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      {projection.payoutDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: '#2c6e2f' }}>R {projection.amount.toFixed(2)}</div>
                    <div style={{ fontSize: '0.7rem', color: '#15803d' }}>includes R{projection.growth.toFixed(2)} interest</div>
                  </div>
                  <span className={`badge ${alreadyPaid ? 'badge-success' : 'badge-warning'}`}>
                    {alreadyPaid ? 'PAID OUT' : 'UPCOMING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {payoutHistory.length > 0 && (
        <div className="dashboard-card">
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>Payout History (All Cycles)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {payoutHistory.map(payout => (
              <div key={payout.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{payout.userName || payout.memberId}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Cycle {payout.cycleId} · {payout.createdAt?.toDate?.().toLocaleDateString('en-ZA')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontWeight: 600, color: '#2c6e2f' }}>R {payout.amount}</div>
                  <span className="badge badge-success">DISBURSED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}