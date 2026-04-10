const UserDashboard = () => {
  // Demo data for a logged‑in user
  const paymentHistory = [
    { id: 1, amount: 500, date: '2025-03-05', status: 'successful' },
    { id: 2, amount: 500, date: '2025-02-05', status: 'successful' },
    { id: 3, amount: 500, date: '2025-01-05', status: 'successful' },
    { id: 4, amount: 500, date: '2024-12-05', status: 'successful' },
  ];

  const upcomingPayments = [
    { id: 1, amount: 500, dueDate: '2025-05-05', status: 'pending' },
    { id: 2, amount: 500, dueDate: '2025-06-05', status: 'pending' },
    { id: 3, amount: 500, dueDate: '2025-07-05', status: 'pending' },
  ];

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const nextPayment = upcomingPayments[0]?.dueDate || 'No upcoming payments';

  return (
    <div className="dashboard">
      <h2>My Dashboard</h2>
      <p style={{ marginBottom: '2rem' }}>Track your stokvel savings and upcoming contributions.</p>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="dashboard-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>💰</div>
          <h3>Total Paid</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--green)' }}>R{totalPaid}</p>
          <small>since joining</small>
        </div>
        <div className="dashboard-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem' }}>📅</div>
          <h3>Next Payment</h3>
          <p style={{ fontWeight: 'bold' }}>{new Date(nextPayment).toLocaleDateString()}</p>
          <small>amount: R{upcomingPayments[0]?.amount}</small>
        </div>
      </div>

      {/* Upcoming payments */}
      <div className="dashboard-card" style={{ marginBottom: '2rem' }}>
        <h3>📆 Upcoming Payments</h3>
        {upcomingPayments.length === 0 ? (
          <p>No upcoming payments. You're all caught up!</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {upcomingPayments.map(p => (
              <li key={p.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)',
                padding: '0.75rem 0'
              }}>
                <span>R{p.amount}</span>
                <span>Due: {new Date(p.dueDate).toLocaleDateString()}</span>
                <span style={{
                  background: 'var(--gold)',
                  color: 'var(--dark-green)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem'
                }}>pending</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payment history */}
      <div className="dashboard-card">
        <h3>📜 Payment History</h3>
        {paymentHistory.length === 0 ? (
          <p>No payments yet. Make your first contribution!</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem' }}>{new Date(p.date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.5rem' }}>R{p.amount}</td>
                    <td style={{ padding: '0.5rem' }}>
                      <span style={{
                        background: 'var(--green)',
                        color: 'white',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem'
                      }}>
                        ✓ {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;