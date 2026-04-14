import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where } from 'firebase/firestore';
import '../index.css';

function BrowseGroupsPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState(null);
  const [searchMember, setSearchMember] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [users, setUsers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);

  const userRole = role || (user ? 'user' : null);
  const isAdmin = userRole === 'admin';
  const isTreasurer = userRole === 'treasurer';

  useEffect(() => {
    fetchGroups();
    fetchUsers();
    if (isAdmin || isTreasurer) {
      fetchJoinRequests();
    }
  }, []);

  const fetchGroups = async () => {
    try {
      const groupsSnap = await getDocs(collection(db, 'groups'));
      const groupsData = groupsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, 'joinRequests'),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJoinRequests(requestsData);
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
    }
  };

  const handleAddParticipant = async (groupId, userId, userName, groupName) => {
    setAddingMember(true);
    try {
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        alert('Group not found');
        return;
      }
      
      const groupData = groupDoc.data();
      const currentMembers = groupData.members || [];
      
      if (currentMembers.includes(userId)) {
        alert('User is already a member of this group');
        return;
      }
      
      await updateDoc(groupRef, {
        members: [...currentMembers, userId],
        memberCount: (groupData.memberCount || 0) + 1
      });
      
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userGroups = userDoc.data().groups || [];
        if (!userGroups.includes(groupId)) {
          await updateDoc(userRef, {
            groups: [...userGroups, groupId]
          });
        }
      }
      
      alert(`Successfully added ${userName} to ${groupName}`);
      
      await fetchGroups();
      await fetchUsers();
      
      setShowAddParticipant(false);
      setSelectedGroupForAdd(null);
      setSearchMember('');
      
    } catch (err) {
      console.error('Failed to add participant:', err);
      alert('Failed to add participant. Please try again.');
    } finally {
      setAddingMember(false);
    }
  };

  const handleApproveRequest = async (request) => {
    setProcessingRequest(request.id);
    try {
      const groupRef = doc(db, 'groups', request.groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const currentMembers = groupDoc.data().members || [];
        if (!currentMembers.includes(request.userId)) {
          await updateDoc(groupRef, {
            members: [...currentMembers, request.userId],
            memberCount: (groupDoc.data().memberCount || 0) + 1
          });
        }
      }
      
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userGroups = userDoc.data().groups || [];
        if (!userGroups.includes(request.groupId)) {
          await updateDoc(userRef, {
            groups: [...userGroups, request.groupId]
          });
        }
      }
      
      await updateDoc(doc(db, 'joinRequests', request.id), {
        status: 'approved',
        approvedAt: new Date()
      });
      
      alert(`Successfully added ${request.userName} to ${request.groupName}`);
      
      await fetchGroups();
      await fetchUsers();
      await fetchJoinRequests();
      
    } catch (err) {
      console.error('Failed to approve request:', err);
      alert('Failed to approve request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (request) => {
    setProcessingRequest(request.id);
    try {
      await updateDoc(doc(db, 'joinRequests', request.id), {
        status: 'declined',
        declinedAt: new Date()
      });
      
      alert(`Request from ${request.userName} declined`);
      await fetchJoinRequests();
      
    } catch (err) {
      console.error('Failed to decline request:', err);
      alert('Failed to decline request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const filteredMembersForAdd = users.filter(u =>
    u.role === 'user' &&
    (u.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.surname?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchMember.toLowerCase())) &&
    !(selectedGroupForAdd && groups.find(g => g.id === selectedGroupForAdd)?.members?.includes(u.id))
  );

  // Add Participant Modal View
  if (showAddParticipant) {
    const selectedGroup = groups.find(g => g.id === selectedGroupForAdd);
    
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => {
                setShowAddParticipant(false);
                setSelectedGroupForAdd(null);
                setSearchMember('');
              }}
            >
              ← Back to Groups
            </button>
          </div>

          <div className="section-card">
            <h3>Add Participant to {selectedGroup?.groupName || selectedGroup?.name}</h3>
            
            <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, surname or email..."
                value={searchMember}
                onChange={(e) => setSearchMember(e.target.value)}
                autoFocus
              />
            </div>
            
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {filteredMembersForAdd.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  {searchMember ? 'No users found or user is already in this group' : 'Start typing to search for users'}
                </p>
              ) : (
                filteredMembersForAdd.map(user => (
                  <div key={user.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--border)'
                  }}>
                    <div>
                      <strong>{user.name} {user.surname || ''}</strong>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{user.email}</small>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAddParticipant(
                        selectedGroupForAdd,
                        user.id,
                        `${user.name} ${user.surname || ''}`,
                        selectedGroup?.groupName || selectedGroup?.name
                      )}
                      disabled={addingMember}
                    >
                      {addingMember ? 'Adding...' : 'Add to Group'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Join Requests View
  if (showJoinRequests && (isAdmin || isTreasurer)) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => setShowJoinRequests(false)}
            >
              ← Back to Groups
            </button>
          </div>

          <div className="section-card">
            <h3>Join Requests ({joinRequests.length})</h3>

            {joinRequests.length === 0 ? (
              <p>No pending join requests</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {joinRequests.map(request => (
                  <div key={request.id} style={{
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1rem',
                    background: 'white'
                  }}>
                    <p><strong>{request.userName}</strong> ({request.userEmail})</p>
                    <p>Wants to join: <strong>{request.groupName}</strong></p>
                    <p><small>Requested: {request.requestedAt?.toDate().toLocaleString()}</small></p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        className="btn btn-success"
                        onClick={() => handleApproveRequest(request)}
                        disabled={processingRequest === request.id}
                      >
                        {processingRequest === request.id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeclineRequest(request)}
                        disabled={processingRequest === request.id}
                      >
                        ✗ Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Browse Groups View
  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <h2>Browse Groups</h2>
          <p>Find and manage stokvel groups</p>
        </div>

        {/* Action buttons for admin/treasurer */}
        {(isAdmin || isTreasurer) && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-outline" 
              onClick={() => setShowJoinRequests(true)}
              style={{ position: 'relative' }}
            >
              View Join Requests
              {joinRequests.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  padding: '2px 6px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {joinRequests.length}
                </span>
              )}
            </button>
          </div>
        )}

        <div className="section-card">
          <h3>All Groups ({groups.length})</h3>

          {loading ? (
            <p>Loading groups...</p>
          ) : groups.length === 0 ? (
            <p>No groups found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {groups.map(group => (
                <div key={group.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '1rem',
                  background: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ flex: 2 }}>
                      <h4 style={{ margin: 0 }}>{group.groupName || group.name}</h4>
                      {group.description && (
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {group.description}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                        {group.contributionAmount && (
                          <span>💰 R{group.contributionAmount}/month</span>
                        )}
                        <span>👥 {(group.members?.length || 0)} / {group.maxMembers || '∞'} members</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {/* Admin/Treasurer: Add Participant button */}
                      {(isAdmin || isTreasurer) && (
                        <button 
                          className="btn btn-primary"
                          onClick={() => {
                            setSelectedGroupForAdd(group.id);
                            setShowAddParticipant(true);
                          }}
                        >
                          + Add Participant
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BrowseGroupsPage;