import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { PaystackButton, usePaystackPayment } from 'react-paystack';

function GroupDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [payoutProjections, setPayoutProjections] = useState([]);
  const [saRates, setSaRates] = useState({ repo: 8.25, prime: 11.75 });
  const paymentTriggered = useRef(false);

  const paystackConfig = {
    amount: (group?.contributionAmount || 0) * 100,
    email: user?.email || "test@gmail.com",
    reference: (new Date()).getTime().toString(),
    publicKey: 'pk_test_321abd607bbc18daba90b70ebdd8cff5ea9b0cee',
    currency: 'ZAR',
    metadata: {
      userId: user?.uid,
      groupId: id,
      groupName: group?.groupName || group?.name,
      userName: user?.displayName || user?.email || "Member"
    }
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  useEffect(() => {
    fetchSaRates();
    fetchGroupDetails();
    fetchPaymentHistory();
    fetchPayoutHistory();
  }, [id, user]);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'pay' && !loading && group && !paymentTriggered.current) {
      paymentTriggered.current = true;
      initializePayment(
        () => {
          alert("Payment successful! Waiting for the server to confirm your transaction.");
          fetchPaymentHistory();
        },
        () => {
          console.log('User closed the payment window');
        }
      );
    }
  }, [searchParams, loading, group, initializePayment]);

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

  const fetchGroupDetails = async () => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', id));
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroup(groupData);

        const memberIds = groupData.members || [];
        const membersData = [];
        for (const memberId of memberIds) {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            membersData.push({ id: memberId, ...userDoc.data() });
          }
        }

        const sortedMembers = membersData.sort((a, b) =>
          (a.name || '').localeCompare(b.name || '')
        );
        setMembers(sortedMembers);
        calculateProjections(groupData, sortedMembers, saRates.prime);
      }
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = (groupData, sortedMembers, primeRate) => {
    const frequency = groupData.meetingFrequency?.toLowerCase() || 'monthly';
    const createdAt = groupData.createdAt?.toDate
      ? groupData.createdAt.toDate()
      : new Date(groupData.createdAt);

    const basePotAmount = (groupData.contributionAmount || 0) * sortedMembers.length;
    const monthlyInterestRate = (primeRate / 100) / 12;

    const getNextPayoutDate = (index) => {
      const date = new Date(createdAt);
      if (frequency === 'monthly') {
        date.setMonth(date.getMonth() + index + 1);
      } else if (frequency === 'quarterly') {
        date.setMonth(date.getMonth() + (index + 1) * 3);
      } else if (frequency === 'weekly') {
        date.setDate(date.getDate() + (index + 1) * 7);
      } else {
        date.setMonth(date.getMonth() + index + 1);
      }
      return date;
    };

    const projections = sortedMembers.map((member, index) => {
      const monthsAccrued = index + 1;
      const projectedGrowth = basePotAmount * Math.pow(1 + monthlyInterestRate, monthsAccrued) - basePotAmount;
      const totalExpectedAmount = basePotAmount + projectedGrowth;

      return {
        memberId: member.id,
        memberName: member.name || member.email,
        position: index + 1,
        payoutDate: getNextPayoutDate(index),
        baseAmount: basePotAmount,
        growth: projectedGrowth,
        amount: totalExpectedAmount,
      };
    });

    setPayoutProjections(projections);
  };

  const fetchPaymentHistory = async () => {
    try {
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('groupId', '==', id),
        where('userId', '==', user?.uid)
      );
      const paymentsSnap = await getDocs(paymentsQuery);
      const paymentsData = paymentsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPaymentHistory(paymentsData.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('groupId', '==', id)
      );
      const payoutsSnap = await getDocs(payoutsQuery);
      const payoutsData = payoutsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.status === 'success');
        
      setPayoutHistory(payoutsData.sort((a, b) => b.createdAt?.toDate() - a.createdAt?.toDate()));
    } catch (err) {
      console.error('Failed to fetch payout history:', err);
    }
  };

  const handlePaystackSuccessAction = () => {
    alert("Payment successful! Waiting for the server to confirm your transaction.");
    fetchPaymentHistory();
  };

  const handlePaystackCloseAction = () => {
    console.log('User closed the payment window');
  };

  const componentProps = {
    ...paystackConfig,
    text: `Pay R${group?.contributionAmount || 0} Now`,
    onSuccess: handlePaystackSuccessAction,
    onClose: handlePaystackCloseAction,
  };

  const myProjection = payoutProjections.find(p => p.memberId === user?.uid);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <p>Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <p>Group not found</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>{group.groupName || group.name}</h2>
              {group.description && <p>{group.description}</p>}
            </div>
            <PaystackButton
              {...componentProps}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-label">Monthly Contribution</div>
              <div className="stat-value">R {group.contributionAmount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Members</div>
              <div className="stat-value">{group.members?.length || 0}</div>
            </div>
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
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>Full Payout Schedule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {payoutProjections.map((projection) => {
              const alreadyPaid = payoutHistory.find(p => p.userId === projection.memberId || p.memberId === projection.memberId);
              const isMe = projection.memberId === user?.uid;
              return (
                <div key={projection.memberId} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: isMe ? '2px solid #2c6e2f' : '1px solid var(--border)',
                  backgroundColor: isMe ? '#f0f9f0' : 'white'
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
                      <div style={{ fontWeight: 600 }}>
                        {projection.memberName}
                        {isMe && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '12px', backgroundColor: '#e0e7ff', color: '#4338ca' }}>You</span>}
                      </div>
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

        <div className="section-card">
          <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>Group Members ({members.length})</h3>
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No members in this group yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    backgroundColor: member.id === user?.uid ? '#f0f9ff' : 'white',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

        {payoutHistory.length > 0 && (
          <div className="section-card">
            <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>Payout History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {payoutHistory.map(payout => (
                <div key={payout.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{payout.userName || payout.memberId}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {payout.createdAt?.toDate?.().toLocaleDateString('en-ZA')}
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

        {paymentHistory.length > 0 && (
          <div className="section-card">
            <h3 style={{ textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.05em', color: '#64748b' }}>My Payment History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              {paymentHistory.map(payment => (
                <div key={payment.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>R {payment.amount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {payment.createdAt?.toDate().toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`badge ${payment.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {(payment.status || 'pending').toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default GroupDetails;