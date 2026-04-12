import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";

function GroupList() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestingGroupId, setRequestingGroupId] = useState(null);
  const [messageMap, setMessageMap] = useState({}); // { groupId: { type, text } }
  const { user } = useAuth();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/groups');
      if (!response.ok) {
        throw new Error('Failed to fetch groups');
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
    setMessageMap(prev => {
      const updated = { ...prev };
      delete updated[groupId];
      return updated;
    });
  };

  const setMessage = (groupId, type, text) => {
    setMessageMap(prev => ({
      ...prev,
      [groupId]: { type, text }
    }));

    // Auto-clear message after 4 seconds
    setTimeout(() => {
      clearMessage(groupId);
    }, 4000);
  };

  const handleJoinRequest = async (groupId) => {
    if (!user) {
      setMessage(groupId, 'error', 'Please log in to send join requests');
      return;
    }

    // Prevent multiple requests for the same group
    if (requestingGroupId === groupId) {
      return;
    }

    setRequestingGroupId(groupId);

    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send join request');
      }

      setMessage(groupId, 'success', 'Join request sent successfully!');
    } catch (err) {
      setMessage(groupId, 'error', err.message);
    } finally {
      setRequestingGroupId(null);
    }
  };

  if (loading) return <p>Loading groups...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      {groups.map(group => {
        const msg = messageMap[group.id];
        const isRequesting = requestingGroupId === group.id;

        return (
          <div key={group.id} className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>{group.groupName}</h3>
              <p>Contribution: R{group.contributionAmount}</p>
              <small>Created: {new Date(group.createdAt).toLocaleDateString()}</small>
              {msg && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  background: msg.type === 'success' ? '#d4edda' : '#f8d7da',
                  color: msg.type === 'success' ? '#155724' : '#721c24',
                  fontSize: '0.9rem'
                }}>
                  {msg.text}
                </div>
              )}
            </div>
            <button
              onClick={() => handleJoinRequest(group.id)}
              disabled={isRequesting || msg?.type === 'success'}
              style={{
                background: msg?.type === 'success' ? '#84d384' : 'var(--green)',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '5px',
                cursor: isRequesting || msg?.type === 'success' ? 'not-allowed' : 'pointer',
                opacity: isRequesting || msg?.type === 'success' ? 0.6 : 1
              }}
            >
              {isRequesting ? 'Sending...' : msg?.type === 'success' ? '✓ Requested' : 'Join Group'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default GroupList;