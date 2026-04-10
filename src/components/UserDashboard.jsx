import '../index.css';

const UserDashboard = () => {
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
  const nextPayment = upcomingPayments[0]?.dueDate || null;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>My Dashboard</h2>
        <p>Track your stokvel savings and upcoming contributions.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Contributed</div>
          <div className="stat-value">R{totalPaid.toLocaleString()}</div>
          <div className="stat-sub">since joining</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next Payment</div>
          <div className="stat-value" style={{ fontSize: '1.3rem' }}>
            {nextPayment ? new Date(nextPayment).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—'}
          </div>
          <div className="stat-sub">R{upcomingPayments[0]?.amount} due</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Payments</div>
          <div className="stat-value">{upcomingPayments.length}</div>
          <div className="stat-sub">scheduled</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Payments Made</div>
          <div className="stat-value">{paymentHistory.length}</div>
          <div className="stat-sub">all successful</div>
        </div>
      </div>

      <div className="dashboard-card">
        <h3>Upcoming Payments</h3>
        {upcomingPayments.length === 0 ? (
          <p>No upcoming payments. You're all caught up!</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingPayments.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.dueDate).toLocaleDateString('en-ZA')}</td>
                    <td><strong>R{p.amount}</strong></td>
                    <td><span className="badge badge-warning">Pending</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3>Payment History</h3>
        {paymentHistory.length === 0 ? (
          <p>No payments yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.date).toLocaleDateString('en-ZA')}</td>
                    <td><strong>R{p.amount}</strong></td>
                    <td><span className="badge badge-success">Successful</span></td>
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