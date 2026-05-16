import { useState, useEffect } from 'react';
import { db } from '../firebase/firebase';
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [chartData, setChartData] = useState([]);

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
      const groups = groupDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
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
    setChartData([]);
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

      const generatedChartData = orderedMembers.map(member => {
        const payment = currentCyclePayments.find(p => p.userId === member.id);
        const payout = allSuccessPayouts.find(p => p.userId === member.id);
        return {
          name: member.name || member.email?.split('@')[0],
          Contributed: payment?.amount ? Number(payment.amount) : 0,
          'Paid Out': payout?.amount ? Number(payout.amount) : 0,
        };
      });
      setChartData(generatedChartData);

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
      const response = await fetch('https://stockvel-2kvp.onrender.com/api/payouts/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroupId,
          groupName,
          recipientId: nextRecipient.id,
          recipientName: nextRecipient.name,
          recipientEmail: nextRecipient.email,
          amount: parseFloat(expectedPot.toFixed(2)),
          initiatedBy: user.uid,
        })
      });
      if (!response.ok) throw new Error('Payout failed');
      setSuccess("Payout initiated successfully");
      setTimeout(() => { setShowPayoutModal(false); fetchDashboardData(selectedGroupId); }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loadingGroups) return (
    <section className="loading-screen">
      <output className="spinner" />
      <h3>Loading your groups…</h3>
    </section>
  );

  if (!selectedGroupId) {
    return (
      <main className="treasurer-page">
        <header className="dashboard-header">
          <h2>Treasurer Dashboard</h2>
          <p>Select a group to manage</p>
        </header>
        {myGroups.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You are not assigned as treasurer to any group.</p>
        ) : (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {myGroups.map(group => (
              <article
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className="dashboard-card"
                style={{ cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
              >
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <strong style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    backgroundColor: 'var(--blue-dark)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1.2rem'
                  }}>
                    {(group.groupName || group.name || '?')[0].toUpperCase()}
                  </strong>
                  <mark className="badge badge-info">Cycle {group.currentCycle || 1}</mark>
                </header>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--text)' }}>
                  {group.groupName || group.name}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {group.members?.length || 0} members · R{group.contributionAmount}/month
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--blue)', fontWeight: 600 }}>Manage →</p>
              </article>
            ))}
          </section>
        )}
      </main>
    );
  }

  if (loadingDashboard) return (
    <section className="loading-screen">
      <output className="spinner" />
      <h3>Syncing ledger…</h3>
    </section>
  );

  return (
    <main className="treasurer-page">
      <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
        <section>
          <h2>Treasurer Dashboard</h2>
          <p>Managing: <strong>{groupName}</strong> — <mark className="badge badge-info">Cycle {currentCycle}</mark></p>
        </section>
        {myGroups.length > 1 && (
          <button className="btn-ghost" onClick={() => setSelectedGroupId(null)} style={{ fontSize: '0.85rem' }}>
            ← Switch Group
          </button>
        )}
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <p className="stat-label">Total Collected</p>
          <p className="stat-value">R {totalCollected.toLocaleString()}</p>
          <p className="stat-sub">cycle {currentCycle} payments</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Compliance Rate</p>
          <p className="stat-value">{complianceRate}%</p>
          <p className="stat-sub">contribution compliance</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Next Payout</p>
          <p className="stat-value" style={{ color: 'var(--success)' }}>R {expectedPot.toFixed(2)}</p>
          <p className="stat-sub">Includes R{accruedInterest.toFixed(2)} interest</p>
        </article>
      </section>

      <nav style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn-primary" onClick={() => setShowPayoutModal(true)}>Record Payout</button>
        <button className="btn-ghost" onClick={downloadCSV}>Export Report (CSV)</button>
      </nav>

      {showPayoutModal && (
        <section className="finance-panel">
          <h3>Initiate Rotation Payout — Cycle {currentCycle}</h3>
          {expectedPot > totalCollected && (
            <p style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
              <strong>⚠️ Insufficient Funds Warning:</strong> Expected payout (R{expectedPot.toFixed(2)}) is greater than total collected (R{totalCollected}).
            </p>
          )}
          {nextRecipient ? (
            <article>
              <p>Next in rotation: <strong>{nextRecipient.name || nextRecipient.email}</strong></p>
              <p style={{ fontSize: '1.2rem', margin: '0.5rem 0' }}>Amount to disburse: <strong>R {expectedPot.toFixed(2)}</strong></p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Base pot R{basePotAmount} + R{accruedInterest.toFixed(2)} interest.</p>
              <footer style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-primary" onClick={handleInitiatePayout} disabled={payoutLoading}>
                  {payoutLoading ? "Processing..." : "Confirm Payout"}
                </button>
                <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Cancel</button>
              </footer>
              {error && <p style={{ color: 'var(--danger)', marginTop: '0.5rem' }}>{error}</p>}
              {success && <p style={{ color: 'var(--success)', marginTop: '0.5rem' }}>{success}</p>}
            </article>
          ) : (
            <p>All members have been paid out this cycle. <button className="btn-ghost" onClick={() => setShowPayoutModal(false)}>Close</button></p>
          )}
        </section>
      )}

      {chartData.length > 0 && (
        <section className="dashboard-card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Contributions vs Payouts — Cycle {currentCycle}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tickFormatter={(v) => `R${v}`} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={(value) => `R${value}`} />
              <Legend />
              <Bar dataKey="Contributed" fill="var(--blue)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Paid Out" fill="var(--success)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      <section className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3>Member Ledger — Cycle {currentCycle}</h3>
        <section className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(member => (
                <tr key={member.id}>
                  <td><strong>{member.name || member.email}</strong></td>
                  <td>{member.amount ? `R${member.amount}` : '—'}</td>
                  <td>
                    <mark className={`badge ${isPaidOrCompleted(member.status) ? 'badge-success' : member.status === 'missed' ? 'badge-danger' : 'badge-warning'}`}>
                      {member.status.toUpperCase()}
                    </mark>
                  </td>
                  <td>
                    <mark className={`badge ${member.isPaidOut ? 'badge-success' : 'badge-pending'}`}>
                      {member.isPaidOut ? 'DISBURSED' : 'WAITING'}
                    </mark>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>

      <section className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
          Full Payout Schedule — Cycle {currentCycle}
        </h3>
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          {payoutProjections.map((projection) => {
            const alreadyPaid = payoutHistory.find(p =>
              (p.userId === projection.memberId || p.memberId === projection.memberId) && p.cycleId === currentCycle
            );
            return (
              <article key={projection.memberId} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', borderRadius: 'var(--radius)',
                border: '1px solid var(--border)', backgroundColor: 'var(--surface)'
              }}>
                <section style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <strong style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    backgroundColor: alreadyPaid ? 'var(--blue)' : 'var(--border)',
                    color: alreadyPaid ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.8rem'
                  }}>
                    {projection.position}
                  </strong>
                  <section>
                    <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{projection.memberName}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      {projection.payoutDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </section>
                </section>
                <section style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <section style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, color: 'var(--blue-dark)', margin: 0 }}>R {projection.amount.toFixed(2)}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>includes R{projection.growth.toFixed(2)} interest</p>
                  </section>
                  <mark className={`badge ${alreadyPaid ? 'badge-success' : 'badge-warning'}`}>
                    {alreadyPaid ? 'PAID OUT' : 'UPCOMING'}
                  </mark>
                </section>
              </article>
            );
          })}
        </section>
      </section>

      {payoutHistory.length > 0 && (
        <section className="dashboard-card">
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Payout History (All Cycles)
          </h3>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {payoutHistory.map(payout => (
              <article key={payout.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)'
              }}>
                <section>
                  <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0 }}>{payout.userName || payout.memberId}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Cycle {payout.cycleId} · {payout.createdAt?.toDate?.().toLocaleDateString('en-ZA')}
                  </p>
                </section>
                <section style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <p style={{ fontWeight: 600, color: 'var(--blue-dark)', margin: 0 }}>R {payout.amount}</p>
                  <mark className="badge badge-success">DISBURSED</mark>
                </section>
              </article>
            ))}
          </section>
        </section>
      )}
    </main>
  );
}