import { useState, useEffect } from "react";

function ShowActiveGroup() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/groups");
        if (!response.ok) throw new Error("Failed to fetch groups");
        const data = await response.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) return <p>Loading groups...</p>;
  if (error) return <p>Error: {error}</p>;
  if (groups.length === 0) return <p>No active groups yet.</p>;

  return (
    <section className="active-groups-container">
      {groups.map((group) => (
        <section className="active-Member" key={group.id}>
          <section className="active-Member-top">
            <h3 className="active-Member-name">{group.groupName}</h3>
            <span className="active-Member-badge">Active</span>
          </section>

          <p className="active-Member-description">{group.description}</p>

          <section className="active-Member-grid">
            <section className="active-Member-stat">
              <span className="stat-label">Contribution</span>
              <span className="stat-value">R{group.contributionAmount}</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Frequency</span>
              <span className="stat-value">{group.meetingFrequency}</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Max Members</span>
              <span className="stat-value">{group.maxMembers}</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{group.duration} months</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Payout Order</span>
              <span className="stat-value">{group.payoutOrder}</span>
            </section>
          </section>

          <p className="active-Member-date">
            Created {new Date(group.createdAt).toLocaleDateString()}
          </p>
        </section>
      ))}
    </section>
  );
}

export default ShowActiveGroup;
