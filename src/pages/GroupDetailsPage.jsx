import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

function GroupDetailsPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);

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
      
      // Fetch member details
      if (data.members && data.members.length > 0) {
        const membersData = [];
        for (const memberId of data.members) {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            membersData.push({ id: memberId, ...userDoc.data() });
          }
        }
        setGroupMembers(membersData);
      }
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
  const adminMember = groupMembers.find(m => m.role === 'admin');
  const treasurerMember = groupMembers.find(m => m.role === 'treasurer');

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

      {/* Group Leadership - shown to all users */}
      <div className="dashboard-card" style={{ marginBottom: "2rem" }}>
        <h3>Group Leadership</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {adminMember && (
            <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px", flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Admin</div>
              <div style={{ fontWeight: 600 }}>{adminMember.name} {adminMember.surname || ''}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{adminMember.email}</div>
            </div>
          )}
          {treasurerMember && (
            <div style={{ padding: "0.75rem", border: "1px solid var(--border)", borderRadius: "8px", flex: 1, minWidth: "150px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Treasurer</div>
              <div style={{ fontWeight: 600 }}>{treasurerMember.name} {treasurerMember.surname || ''}</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>{treasurerMember.email}</div>
            </div>
          )}
          {!adminMember && !treasurerMember && (
            <p style={{ color: "var(--text-muted)" }}>No leadership information available</p>
          )}
        </div>
      </div>

      {isMember && (
        <div className="dashboard-card">
          <h3>Group Members</h3>
          <p>
            As a member of this group, you can see who else is participating.
          </p>
          {groupMembers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {groupMembers.map((member) => (
                <div 
                  key={member.id} 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    backgroundColor: member.id === user?.uid ? "#f0f9ff" : "white",
                    border: "1px solid var(--border)",
                    borderRadius: "8px"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
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
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {member.email}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${
                    member.role === 'admin' ? 'badge-danger' :
                    member.role === 'treasurer' ? 'badge-warning' : 'badge-info'
                  }`}>
                    {member.role || 'member'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>
              No members found.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default GroupDetailsPage;
