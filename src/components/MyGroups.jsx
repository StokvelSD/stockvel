import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import GroupDetails from '../components/GroupDetails';

function MyGroups() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myGroups, setMyGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyGroups();
  }, [user]);

  const fetchMyGroups = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user document to find which groups they're in
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      const userGroupIds = userData?.groups || [];
      
      if (userGroupIds.length === 0) {
        setMyGroups([]);
        setLoading(false);
        return;
      }
      
      // Fetch each group by ID
      const groupsData = [];
      for (const groupId of userGroupIds) {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          groupsData.push({
            id: groupDoc.id,
            ...groupDoc.data()
          });
        }
      }
      
      setMyGroups(groupsData);
    } catch (err) {
      console.error('Failed to fetch my groups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={{ padding: '1rem', textAlign: 'center' }}>Loading your groups...</p>;
  }

  if (myGroups.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          You haven't joined any groups yet.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {myGroups.map(group => (
        <div key={group.id} style={{
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1rem',
          background: 'white',
          transition: 'all 0.2s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 2 }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem' }}>
                {group.groupName || group.name}
              </h4>
              {group.description && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {group.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                {group.contributionAmount && (
                  <span>💰 R{group.contributionAmount}/month</span>
                )}
                <span>👥 {(group.members?.length || 0)} members</span>
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/group/${group.id}`)}
              style={{ minWidth: '120px' }}
            >
              View Group
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MyGroups;