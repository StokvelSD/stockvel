import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function GroupDetailsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const response = await fetch(
        `https://stockvel-2kvp.onrender.com/api/groups/${groupId}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || errorData.message || "Failed to fetch group",
        );
      }
      const data = await response.json();
      setGroup(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading group...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!group) return <p>Group not found</p>;

  const isMember = group.members && group.members.includes(user?.uid);

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <button
        onClick={() => navigate("/browse-groups")}
        style={{
          background: "var(--border)",
          color: "var(--text)",
          border: "none",
          padding: "0.5rem 1rem",
          borderRadius: "5px",
          cursor: "pointer",
          marginBottom: "1rem",
        }}
      >
        ← Back to Browse Groups
      </button>

      <div className="dashboard-card" style={{ marginBottom: "2rem" }}>
        <h2>{group.groupName}</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
          {group.description}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <strong>Contribution:</strong> R{group.contributionAmount}
          </div>
          <div>
            <strong>Frequency:</strong> {group.meetingFrequency}
          </div>
          <div>
            <strong>Members:</strong> {group.members ? group.members.length : 0}{" "}
            / {group.maxMembers}
          </div>
          <div>
            <strong>Duration:</strong> {group.duration} months
          </div>
          <div>
            <strong>Payout Order:</strong> {group.payoutOrder}
          </div>
        </div>

        <small style={{ color: "var(--text-secondary)" }}>
          Created: {new Date(group.createdAt).toLocaleDateString()}
        </small>
      </div>

      {isMember && (
        <div className="dashboard-card">
          <h3>Group Members</h3>
          <p>
            As a member of this group, you can see who else is participating.
          </p>
          {/* TODO: Fetch and display member details */}
          <p style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
            Member details will be displayed here once user profiles are
            implemented.
          </p>
        </div>
      )}
    </div>
  );
}

export default GroupDetailsPage;
