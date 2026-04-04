import { useState } from 'react';

function TreasurerDashboard() {
  
  const [showFinancePanel, setShowFinancePanel] = useState(false);
  const [contributions, setContributions] = useState([
    { id: 1, member: 'Nosipho L.', amount: 500, date: '2026-04-01', status: 'paid' },
    { id: 2, member: 'Thabo M.', amount: 500, date: '2026-04-01', status: 'paid' },
    { id: 3, member: 'Lerato S.', amount: 500, date: '2026-04-02', status: 'pending' },
    { id: 4, member: 'Sipho D.', amount: 500, date: '2026-04-02', status: 'pending' },
    { id: 5, member: 'Nomsa M.', amount: 500, date: '2026-04-03', status: 'pending' }
  ]);

  const totalContributions = contributions.reduce((sum, c) => sum + (c.status === 'paid' ? c.amount : 0), 0);
  const pendingCount = contributions.filter(c => c.status === 'pending').length;
  const members = contributions.length; 
  const nextRotation = '15 May 2026';

  const handleConfirm = (id) => {
    setContributions(contributions.map(c =>
      c.id === id ? { ...c, status: 'paid' } : c
    ));
  };

  const handleRecordPayout = () => {
    alert('💰 Payout recorded! (Demo) In production, this would save to the database.');
  };

  const handleFinanceAction = (e) => {
    e.preventDefault();
    alert('✅ Finance action saved (demo).');
    setShowFinancePanel(false);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#fefcf5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        
        <h2 style={{ color: '#1e4a2a', marginTop: '0' }}>Treasurer Dashboard</h2>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Manage contributions, payouts, and circle finances.</p>

        {/* Stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px' }}>
            <div style={{ fontSize: '2rem' }}>💰</div>
            <h3 style={{ margin: '10px 0' }}>Total Collected</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2c6e2f', margin: 0 }}>R {totalContributions}</p>
            <small style={{ color: '#888' }}>this month</small>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px' }}>
            <div style={{ fontSize: '2rem' }}>👥</div>
            <h3 style={{ margin: '10px 0' }}>Active Members</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{members}</p>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px' }}>
            <div style={{ fontSize: '2rem' }}>⏳</div>
            <h3 style={{ margin: '10px 0' }}>Pending</h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f4b942', margin: 0 }}>{pendingCount}</p>
            <small style={{ color: '#888' }}>contributions</small>
          </div>
          <div style={{ textAlign: 'center', padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px' }}>
            <div style={{ fontSize: '2rem' }}>📅</div>
            <h3 style={{ margin: '10px 0' }}>Next Payout</h3>
            <p style={{ fontWeight: 'bold', margin: 0 }}>{nextRotation}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button onClick={() => setShowFinancePanel(!showFinancePanel)} style={{ backgroundColor: '#2c6e2f', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            📊 Manage Finances
          </button>
          <button onClick={handleRecordPayout} style={{ backgroundColor: '#f4b942', color: '#1e4a2a', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            💸 Record Payout
          </button>
        </div>

        {/* Finance panel (conditional) */}
        {showFinancePanel && (
          <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px', backgroundColor: '#fafafa' }}>
            <h3 style={{ marginTop: 0 }}>Circle Finances</h3>
            <form onSubmit={handleFinanceAction}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Expense category:</label>
                <select style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ccc' }}>
                  <option>Meeting venue</option>
                  <option>Emergency fund</option>
                  <option>Investment</option>
                  <option>Other</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>Amount (R):</label>
                <input type="number" placeholder="0.00" style={{ width: '100%', padding: '0.8rem', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
              </div>
              <button type="submit" style={{ backgroundColor: '#2c6e2f', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Save Transaction</button>
            </form>
          </div>
        )}

        {/* Recent contributions table with YOUR logic */}
        <div style={{ padding: '1.5rem', border: '1px solid #eee', borderRadius: '15px' }}>
          <h3 style={{ marginTop: 0 }}>Member Contributions</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #2c6e2f' }}>
                  <th style={{ padding: '1rem' }}>Member</th>
                  <th style={{ padding: '1rem' }}>Amount</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{c.member}</td>
                    <td style={{ padding: '1rem' }}>R {c.amount}</td>
                    <td style={{ padding: '1rem', color: '#666' }}>{c.date}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        background: c.status === 'paid' ? '#eefbef' : '#fff5f5',
                        color: c.status === 'paid' ? '#2c6e2f' : '#721c24',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {/* Your custom action button */}
                      {c.status === 'pending' && (
                        <button 
                          onClick={() => handleConfirm(c.id)}
                          style={{ backgroundColor: '#2c6e2f', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Confirm
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
    </div>
  );
}

export default TreasurerDashboard;