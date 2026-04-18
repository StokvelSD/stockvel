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
  const paymentTriggered = useRef(false);

  // Paystack config
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
    fetchGroupDetails();
    fetchPaymentHistory();
  }, [id, user]);

  // Auto-trigger payment if action=pay query param is present
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'pay' && !loading && group && !paymentTriggered.current) {
      paymentTriggered.current = true;
      initializePayment(
        (reference) => {
          alert("Payment successful! Waiting for the server to confirm your transaction.");
          fetchPaymentHistory();
        },
        () => {
          console.log('User closed the payment window');
        }
      );
    }
  }, [searchParams, loading, group, initializePayment]);

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
        setMembers(membersData);
      }
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setLoading(false);
    }
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

  const handlePaystackSuccessAction = (reference) => {
    alert("Payment successful! Waiting for the server to confirm your transaction.");
    fetchPaymentHistory(); 
  };

  const handlePaystackCloseAction = () => {
    console.log('User closed the payment window');
  };

  const componentProps = {
    ...paystackConfig,
    text: `Pay R${group?.contributionAmount || 0} Now`,
    onSuccess: (reference) => handlePaystackSuccessAction(reference),
    onClose: handlePaystackCloseAction,
  };

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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            <div className="stat-card">
              <div className="stat-label">Monthly Contribution</div>
              <div className="stat-value">R{group.contributionAmount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Members</div>
              <div className="stat-value">{group.members?.length || 0}</div>
            </div>
            {group.paymentDay && (
              <div className="stat-card">
                <div className="stat-label">Payment Day</div>
                <div className="stat-value">Day {group.paymentDay}</div>
              </div>
            )}
            {group.maxMembers && (
              <div className="stat-card">
                <div className="stat-label">Max Members</div>
                <div className="stat-value">{group.maxMembers}</div>
              </div>
            )}
          </div>
        </div>

        <div className="section-card">
          <h3>👥 Group Members ({members.length})</h3>
          
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No members in this group yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: member.role === 'admin' ? '#dc2626' : member.role === 'treasurer' ? '#f59e0b' : '#10b981',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '1rem'
                    }}>
                      {(member.name?.[0] || member.email?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {member.name} {member.surname || ''}
                        {member.id === user?.uid && (
                          <span style={{ 
                            marginLeft: '0.5rem', 
                            fontSize: '0.7rem', 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '12px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca'
                          }}>
                            You
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${
                      member.role === 'admin' ? 'badge-danger' :
                      member.role === 'treasurer' ? 'badge-warning' : 'badge-info'
                    }`}>
                      {member.role || 'member'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paymentHistory.length > 0 && (
          <div className="section-card">
            <h3>💰 My Payment History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {paymentHistory.map(payment => (
                <div key={payment.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px'
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>R{payment.amount}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {payment.createdAt?.toDate().toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className={`badge ${payment.status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                      {payment.status || 'pending'}
                    </span>
                  </div>
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