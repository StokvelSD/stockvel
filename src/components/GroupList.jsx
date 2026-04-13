import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingGroupId, setRequestingGroupId] = useState(null);
  const [messageMap, setMessageMap] = useState({}); // { groupId: { type, text } }
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch(
        "https://stockvel-2kvp.onrender.com/api/groups",
      );
      if (!response.ok) {
        throw new Error("Failed to fetch groups");
      }
      const data = await response.json();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearMessage = (groupId) => {
    setMessageMap((prev) => {
      const updated = { ...prev };
      delete updated[groupId];
      return updated;
    });
  };

  const setMessage = (groupId, type, text) => {
    setMessageMap((prev) => ({
      ...prev,
      [groupId]: { type, text },
    }));

    // Auto-clear message after 4 seconds
    setTimeout(() => {
      clearMessage(groupId);
    }, 4000);
  };

  const handleJoinGroup = async (groupId) => {
    if (!user) {
      setMessage(groupId, "error", "Please log in to join");
      return;
    }

    // Prevent multiple requests for the same group
    if (requestingGroupId === groupId) {
      return;
    }

    setRequestingGroupId(groupId);

    try {
      const response = await fetch(
        "https://stockvel-2kvp.onrender.com/api/groups/${groupId}/join",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: user.uid }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      setMessage(groupId, "success", data.message);

      // Refetch groups to update member count and button state
      setTimeout(() => {
        fetchGroups();
      }, 500);
    } catch (err) {
      setMessage(groupId, "error", err.message);
    } finally {
      setRequestingGroupId(null);
    }
  };

  if (loading) return <p>Loading groups...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {groups.map((group) => {
        const msg = messageMap[group.id];
        const isRequesting = requestingGroupId === group.id;
        const isFull =
          (group.members ? group.members.length : 0) >= group.maxMembers;
        const isMember = group.members && group.members.includes(user?.uid);

        return (
          <div
            key={group.id}
            className="dashboard-card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h3>{group.groupName}</h3>
              <p>Contribution: R{group.contributionAmount}</p>
              <p>
                Members: {group.members ? group.members.length : 0} /{" "}
                {group.maxMembers}
              </p>
              <small>
                Created: {new Date(group.createdAt).toLocaleDateString()}
              </small>
              {msg && (
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    background: msg.type === "success" ? "#d4edda" : "#f8d7da",
                    color: msg.type === "success" ? "#155724" : "#721c24",
                    fontSize: "0.9rem",
                  }}
                >
                  {msg.text}
                </div>
              )}
            </div>
            <button
              onClick={
                isMember
                  ? () => navigate(`/group/${group.id}`)
                  : () => handleJoinGroup(group.id)
              }
              disabled={isRequesting || msg?.type === "success" || isFull}
              style={{
                background:
                  msg?.type === "success"
                    ? "#22c55e"
                    : isFull
                      ? "#94a3b8"
                      : "#16a34a",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "5px",
                fontWeight: "600",
                fontSize: "0.95rem",
                cursor:
                  isRequesting || msg?.type === "success" || isFull
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isRequesting || msg?.type === "success" || isFull ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {isRequesting
                ? "Joining..."
                : msg?.type === "success"
                  ? "✓ Joined"
                  : isFull
                    ? "Full"
                    : isMember
                      ? "View Group"
                      : "Join Group"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default GroupList;
