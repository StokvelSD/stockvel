import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

function GroupDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);

  useEffect(() => {
    fetchGroupDetails();
    fetchPaymentHistory();
  }, [id]);

  const fetchGroupDetails = async () => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', id));
      if (groupDoc.exists()) {
        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        setGroup(groupData);
        
        // Fetch member details
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

  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setProcessingPayment(true);
    try {
      const paymentData = {
        groupId: id,
        groupName: group.groupName || group.name,
        userId: user.uid,
        userName: user.displayName || user.email,
        amount: Number(paymentAmount),
        method: paymentMethod,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'payments'), paymentData);
      
      alert(`Payment of R${paymentAmount} submitted successfully! It will be confirmed by the treasurer.`);
      
      setPaymentAmount('');
      setPaymentMethod('cash');
      setShowPaymentModal(false);
      await fetchPaymentHistory();
      
    } catch (err) {
      console.error('Failed to process payment:', err);
      alert('Failed to process payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
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

        {/* Group Information */}
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2>{group.groupName || group.name}</h2>
              {group.description && <p>{group.description}</p>}
            </div>
            <button 
              className="btn btn-primary"
              onClick={() => setShowPaymentModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              Make Payment
            </button>
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

        {/* Members List */}
        <div className="section-card">
          <h3>👥 Group Members ({members.length})</h3>
          
          {members.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No members in this group yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {members.map((member, index) => (
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
                    transition: 'all 0.2s ease'
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

        {/* Payment History */}
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
                    <span className={`badge ${payment.status === 'confirmed' ? 'badge-success' : 'badge-warning'}`}>
                      {payment.status || 'pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowPaymentModal(false)}>
            <div className="modal-content" style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Make Payment</h3>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleMakePayment}>
                <div className="form-group">
                  <label>Group</label>
                  <input 
                    type="text" 
                    value={group.groupName || group.name} 
                    disabled 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: '#f5f5f5' }}
                  />
                </div>
                
                <div className="form-group">
                  <label>Amount (R)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={`Enter amount (min: R${group.contributionAmount})`}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min={group.contributionAmount || 0}
                    required
                    autoFocus
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                  />
                  {group.contributionAmount && (
                    <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                      Minimum contribution: R{group.contributionAmount}
                    </small>
                  )}
                </div>
                
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)' }}
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setShowPaymentModal(false)}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={processingPayment}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {processingPayment ? 'Processing...' : 'Submit Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetails;