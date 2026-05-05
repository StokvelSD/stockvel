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
  const [saRates, setSaRates] = useState({ repo: 8.25, prime: 11.75 });

  useEffect(() => {
    if (!user) return;
    fetchSaRates();
    fetchDashboardData();
  }, [user]);

  const fetchSaRates = async () => {
    try {
      const response = await fetch('https://stockvel-2kvp.onrender.com/api/sarb-rates');
      if (!response.ok) {
        throw new Error("Failed to fetch from SARB proxy");
      }
      const data = await response.json();
      if (data.repo && data.prime) {
        setSaRates({ repo: data.repo, prime: data.prime });
      } else {
        throw new Error("Invalid data format from SARB");
      }
    } catch (err) {
      console.error('SARB Fetch Error (using fallbacks):', err);
      setSaRates({ repo: 8.25, prime: 11.75 });
    }
  };

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
      const memberDocs = await Promise.all(memberIds.map(id => getDoc(doc(db, 'users', id))));
      const members = memberDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));

      const sortedMembers = members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('groupId', '==', currentGroupId)));
      const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const payoutsSnap = await getDocs(query(collection(db, 'payouts'), where('groupId', '==', currentGroupId)));
      const payouts = payoutsSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.status === 'success');

      const paidOutIds = payouts.map(p => p.userId);

      const joined = sortedMembers.map(member => {
        const payment = payments.find(p => p.userId === member.id);
        return {
          ...member,
          paymentId: payment?.id || null,
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

  const flagAsMissed = async (member) => {
    if (!member.paymentId) {
        alert("Cannot flag: No payment record found to update.");
        return;
    }
    try {
        await updateDoc(doc(db, 'payments', member.paymentId), { status: 'missed' });
        alert(`${member.name || member.email} has been flagged for a missed contribution.`);
        fetchDashboardData();
    } catch (err) {
        console.error("Error flagging payment:", err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Member", "Email", "Amount Paid", "Payment Date", "Contribution Status", "Payout Status"];
    const rows = tableData.map(m => [
      m.name || m.email,
      m.email,
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
    link.setAttribute("download", `${groupName}_Contribution_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculations
  const totalCollected = tableData.filter(m => isPaidOrCompleted(m.status)).reduce((sum, m) => sum + (Number(m.amount) || 0), 0);
  const complianceRate = tableData.length ? Math.round((tableData.filter(m => isPaidOrCompleted(m.status)).length / tableData.length) * 100) : 0;
  
  const basePotAmount = (groupDocData?.contributionAmount || 0) * tableData.length;
  let expectedPot = basePotAmount;
  let accruedInterest = 0;

  if (nextRecipient) {
    const recipientIndex = tableData.findIndex(m => m.id === nextRecipient.id);
    if (recipientIndex !== -1) {
      const monthsAccrued = recipientIndex + 1;
      const monthlyInterestRate = (saRates.prime / 100) / 12;
      accruedInterest = basePotAmount * Math.pow(1 + monthlyInterestRate, monthsAccrued) - basePotAmount;
      expectedPot = basePotAmount + accruedInterest;
    }
  }

  const handleInitiatePayout = async () => {
    if (!nextRecipient) return;
    setError('');
    setSuccess('');
    setPayoutLoading(true);
    try {
      // Pass the fully rounded interest-inclusive amount to Paystack
      const finalPayoutAmount = parseFloat(expectedPot.toFixed(2));
      await initiatePayout({ groupId: groupId, amount: finalPayoutAmount, currentCycleId: 1 });
      
      setSuccess("Payout initiated successfully");
      setTimeout(() => { setShowPayoutModal(false); fetchDashboardData(); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><h3>Syncing ledger…</h3></div>;

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
          <h3>Initiate Rotation Payout</h3>
          {expectedPot > totalCollected && (
            <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid #f87171' }}>
              <strong>⚠️ Insufficient Funds Warning:</strong><br/>
              The expected payout (R{expectedPot.toFixed(2)}) is greater than the total collected funds (R{totalCollected}).
            </div>
          )}
          {nextRecipient ? (
            <>
              <p>Next in rotation: <strong>{nextRecipient.name || nextRecipient.email}</strong></p>
              <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>Amount to disburse: <strong>R {expectedPot.toFixed(2)}</strong></p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Includes base pot of R{basePotAmount} + R{accruedInterest.toFixed(2)} interest.</p>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleInitiatePayout} disabled={payoutLoading}>{payoutLoading ? "Processing..." : "Confirm Payout"}</button>
                <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Cancel</button>
              </div>
              {error && <p style={{ color: "red", marginTop: '0.5rem' }}>{error}</p>}
              {success && <p style={{ color: "green", marginTop: '0.5rem' }}>{success}</p>}
            </>
          ) : (
            <p>All members have been paid out. <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Close</button></p>
          )}
        </div>
      )}

      <div className="dashboard-card">
        <h3>Member Ledger</h3>
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
    </div>
  );
}