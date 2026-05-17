// src/components/ROICalculator.jsx
const ROICalculator = ({ groupContributions, paymentHistory, totalPaid }) => {
  // Calculate total interest earned (if you have payout data)
  // For now, show contribution breakdown per group
  
  const getGroupROI = (groupId) => {
    const group = groupContributions.find(g => g.groupId === groupId);
    if (!group) return null;
    // Calculate percentage of total contributions
    const percentage = (group.totalPaid / totalPaid) * 100;
    return { totalPaid: group.totalPaid, percentage: percentage.toFixed(1) };
  };

  if (groupContributions.length === 0) return null;

  return (
    <section className="section-card" style={{ marginBottom: "2rem" }}>
      <h3>📈 Investment Breakdown by Group</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Group Name</th>
              <th>Total Invested</th>
              <th>% of Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {groupContributions.map(group => {
              const roi = getGroupROI(group.groupId);
              return (
                <tr key={group.groupId}>
                  <td><strong>{group.groupName}</strong></td>
                  <td>R{group.totalPaid.toLocaleString()}</td>
                  <td>{roi?.percentage}%</td>
                  <td><span className="badge badge-success">Active</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default ROICalculator;