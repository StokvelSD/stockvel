import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { usePaystackPayment } from 'react-paystack';

function PaystackPayButton({ amount, email, userId, groupId, groupName, userName, onSuccess, onClose }) {
  const config = {
    amount: amount * 100,
    email,
    reference: (new Date()).getTime().toString(),
    publicKey: 'pk_test_321abd607bbc18daba90b70ebdd8cff5ea9b0cee',
    currency: 'ZAR',
    metadata: { userId, groupId, groupName, userName },
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <button
      className="btn btn-primary"
      style={{ cursor: 'pointer' }}
      onClick={() => initializePayment(onSuccess, onClose)}
    >
      Pay R{amount} Now
    </button>
  );
}

function GroupDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [payoutProjections, setPayoutProjections] = useState([]);
  const [saRates, setSaRates] = useState({ repo: 8.25, prime: 11.75 });
  const [myPaymentThisCycle, setMyPaymentThisCycle] = useState(null);
  const [nextDueDate, setNextDueDate] = useState(null);

  useEffect(() => {
    fetchSaRates();
  }, []);

  useEffect(() => {
    if (id && user) fetchGroupDetails();
  }, [id, user]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'pay' && !loading && group) {
      // auto-pay handled by button render
    }
  }, [searchParams, loading, group]);

  const fetchSaRates = async () => {
    try {
      const response = await fetch('https://stockvel-2kvp.onrender.com/api/sarb-rates');
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      if (data.repo && data.prime) setSaRates({ repo: data.repo, prime: data.prime });
    } catch {
      setSaRates({ repo: 8.25, prime: 11.75 });
    }
  };

  const fetchGroupDetails = async () => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', id));
      if (!groupDoc.exists()) return;

      const groupData = { id: groupDoc.id, ...groupDoc.data() };
      setGroup(groupData);

      const payoutOrder = groupData.payoutOrder || groupData.members || [];
      const currentCycle = groupData.currentCycle || 1;
      const frequency = groupData.meetingFrequency?.toLowerCase() || 'monthly';
      const cycleStartDate = groupData.cycleStartDate?.toDate
        ? groupData.cycleStartDate.toDate()
        : new Date(groupData.cycleStartDate || groupData.createdAt);

      const memberDocs = await Promise.all(payoutOrder.map(uid => getDoc(doc(db, 'users', uid))));
      const orderedMembers = memberDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
      setMembers(orderedMembers);

      const myIndex = payoutOrder.indexOf(user?.uid);
      if (myIndex !== -1) {
        const due = new Date(cycleStartDate);
        if (frequency === 'monthly') due.setMonth(due.getMonth() + myIndex + 1);
        else if (frequency === 'quarterly') due.setMonth(due.getMonth() + (myIndex + 1) * 3);
        else if (frequency === 'weekly') due.setDate(due.getDate() + (myIndex + 1) * 7);
        else due.setMonth(due.getMonth() + myIndex + 1);
        setNextDueDate(due);
      }

      const paymentsSnap = await getDocs(
        query(collection(db, 'payments'), where('groupId', '==', id), where('userId', '==', user?.uid))
      );
      const myPayments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myCurrentPayment = myPayments.find(p => p.cycleId === currentCycle) || null;
      setMyPaymentThisCycle(myCurrentPayment);

      const basePotAmount = (groupData.contributionAmount || 0) * orderedMembers.length;
      const monthlyInterestRate = (saRates.prime / 100) / 12;

      const projections = orderedMembers.map((member, index) => {
        const date = new Date(cycleStartDate);
        if (frequency === 'monthly') date.setMonth(date.getMonth() + index + 1);
        else if (frequency === 'quarterly') date.setMonth(date.getMonth() + (index + 1) * 3);
        else if (frequency === 'weekly') date.setDate(date.getDate() + (index + 1) * 7);
        else date.setMonth(date.getMonth() + index + 1);

        const growth = basePotAmount * Math.pow(1 + monthlyInterestRate, index + 1) - basePotAmount;
        return {
          memberId: member.id,
          memberName: member.name || member.email,
          position: index + 1,
          payoutDate: date,
          baseAmount: basePotAmount,
          growth,
          amount: basePotAmount + growth,
        };
      });

      setPayoutProjections(projections);
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  };

  const myProjection = payoutProjections.find(p => p.memberId === user?.uid);
  const isPaid = myPaymentThisCycle && ['paid', 'completed', 'confirmed'].includes((myPaymentThisCycle.status || '').toLowerCase());

  if (loading) return <div className="dashboard-page"><div className="dashboard-inner"><p>Loading group details...</p></div></div>;
  if (!group) return <div className="dashboard-page"><div className="dashboard-inner"><p>Group not found</p><button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>← Back</button>
        </div>

        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>{group.groupName || group.name}</h2>
              {group.description && <p>{group.description}</p>}
            </div>
            {isPaid ? (
              <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontWeight: 600, fontSize: '0.9rem' }}>
                ✓ Contributed this cycle
              </div>
            ) : (
              <PaystackPayButton
                amount={group.contributionAmount}
                email={user?.email}
                userId={user?.uid}
                groupId={id}
                groupName={group.groupName || group.name}
                userName={user?.displayName || user?.email}
                onSuccess={() => alert("Payment successful! Waiting for the server to confirm your transaction.")}
                onClose={() => console.log('Closed')}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-label">Contribution Amount</div>
              <div className="stat-value">R {group.contributionAmount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Members</div>
              <div className="stat-value">{members.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Current Cycle</div>
              <div className="stat-value">#{group.currentCycle || 1}</div>
            </div>
            {nextDueDate && (
              <div className="stat-card" style={{ backgroundColor: isPaid ? '#f0fdf4' : '#fffbeb', border: isPaid ? '1px solid #bbf7d0' : '1px solid #fde68a' }}>
                <div className="stat-label" style={{ color: isPaid ? '#166534' : '#92400e' }}>
                  {isPaid ? 'Payment Status' : 'Next Due Date'}
                </div>
                <div className="stat-value" style={{ fontSize: '1rem', color: isPaid ? '#15803d' : '#b45309' }}>
                  {isPaid ? 'Paid ✓' : nextDueDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            )}
            <div className="stat-card" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="stat-label" style={{ color: '#166534' }}>SA Prime Rate</div>
              <div className="stat-value" style={{ color: '#15803d' }}>{saRates.prime}%</div>
            </div>
            <div className="stat-card" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div className="stat-label" style={{ color: '#166534' }}>SA Repo Rate</div>
              <div className="stat-value" style={{ color: '#15803d' }}>{saRates.repo}%</div>
            </div>
          </div>
        </div>

        {myProjection && (
          <div className="section-card" style={{ background: 'linear-gradient(135deg, #1e4a2a 0%, #2c6e2f 100%)', color: 'white', border: 'none' }}>
            <h3 style={{ color: 'white', marginTop: 0, textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em' }}>Your Payout Projection</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Your Position</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>#{myProjection.position}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>in rotation</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Expected Payout Date</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#bbf7d0' }}>
                  {myProjection.payoutDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Projected Growth (Interest)</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#bbf7d0' }}>
                  + R {myProjection.growth.toFixed(2)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Expected Total Amount</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f4b942' }}>R {myProjection.amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="section-card">
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>Rotation Order ({members.length})</h3>
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No members in this group yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {members.map((member, index) => (
                <div key={member.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: member.id === user?.uid ? '#f0f9ff' : 'white',
                  border: '1px solid var(--border)', borderRadius: '8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#1e4a2a', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '0.8rem'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      backgroundColor: member.role === 'admin' ? '#dc2626' : member.role === 'treasurer' ? '#f59e0b' : '#10b981',
                      color: 'white', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem'
                    }}>
                      {(member.name?.[0] || member.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {member.name} {member.surname || ''}
                        {member.id === user?.uid && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.email}</div>
                    </div>
                  </div>
                  <span className={`badge ${member.role === 'admin' ? 'badge-danger' : member.role === 'treasurer' ? 'badge-warning' : 'badge-info'}`}>
                    {member.role || 'member'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GroupDetails;