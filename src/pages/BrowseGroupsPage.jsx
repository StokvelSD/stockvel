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
  const [userGroupIds, setUserGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState(null);
  const [searchMember, setSearchMember] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [users, setUsers] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showGroupOverview, setShowGroupOverview] = useState(false);
  const [selectedGroupOverview, setSelectedGroupOverview] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(null);
  const [userPendingRequests, setUserPendingRequests] = useState([]);
  
  // Pagination for members
  const [membersPage, setMembersPage] = useState(1);
  const membersPerPage = 5;
  
  // Pagination for My Groups and Other Groups
  const [myGroupsPage, setMyGroupsPage] = useState(1);
  const [otherGroupsPage, setOtherGroupsPage] = useState(1);
  const groupsPerPage = 5;

  const userRole = role || (user ? 'user' : null);
  const isAdmin = userRole === 'admin';
  const isTreasurer = userRole === 'treasurer';

  // Separate groups into my groups and other groups
  // Check both user's groups array AND group's members array
  const isUserMemberOfGroup = (group) => {
    if (userGroupIds.includes(group.id)) return true;
    if (group.members && group.members.includes(user?.uid)) return true;
    return false;
  };
  
  const myGroups = groups.filter(g => isUserMemberOfGroup(g));
  // Sort otherGroups: groups with pending requests first (most recent first), then by creation date
  const otherGroups = groups
    .filter(g => !isUserMemberOfGroup(g))
    .sort((a, b) => {
      // Check if user has pending request for each group
      const aHasRequest = userPendingRequests.some(r => r.groupId === a.id);
      const bHasRequest = userPendingRequests.some(r => r.groupId === b.id);
      
      // If both have requests or both don't have requests, sort by creation date (newest first)
      if (aHasRequest === bHasRequest) {
        const aDate = a.createdAt?.toDate?.() || new Date(0);
        const bDate = b.createdAt?.toDate?.() || new Date(0);
        return bDate - aDate;
      }
      
      // Groups with pending requests come first
      return aHasRequest ? -1 : 1;
    });

  useEffect(() => {
    fetchGroups();
    fetchUserGroups();
    fetchUsers();
    fetchUserPendingRequests();
  }, []);

  // Fetch join requests when groups and user data are loaded
  useEffect(() => {
    if (groups.length > 0 && (isAdmin || isTreasurer || user)) {
      fetchJoinRequests();
    }
  }, [groups, userGroupIds, user, isAdmin, isTreasurer]);

  const fetchUserPendingRequests = async () => {
    if (!user) return;
    try {
      const requestsQuery = query(
        collection(db, 'joinRequests'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserPendingRequests(requestsData);
    } catch (err) {
      console.error('Failed to fetch user pending requests:', err);
    }
  };

  const fetchUserGroups = async () => {
    if (!user) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserGroupIds(userData.groups || []);
      }
    } catch (err) {
      console.error('Failed to fetch user groups:', err);
    }
  };

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
      // Get all pending requests
      const requestsQuery = query(
        collection(db, 'joinRequests'),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      const allRequests = requestsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter to only show requests for groups the user is a member of
      // (excluding requests the user made to other groups)
      const filteredRequests = allRequests.filter(request => {
        // Check if user is a member of this group
        const group = groups.find(g => g.id === request.groupId);
        if (!group) return false;
        
        // Check if user is in the group's members array
        if (group.members && group.members.includes(user?.uid)) return true;
        
        // Check if group is in user's groups array
        if (userGroupIds.includes(request.groupId)) return true;
        
        return false;
      });
      
      setJoinRequests(filteredRequests);
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
    }
  };

  const fetchGroupMembers = async (groupId) => {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));
      if (groupDoc.exists()) {
        const groupData = groupDoc.data();
        const memberIds = groupData.members || [];
        const groupRoles = groupData.groupRoles || {};
        const membersData = [];
        
        for (const memberId of memberIds) {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Get role from groupRoles (group-specific), fallback to user's global role, default to 'user'
            const memberRole = groupRoles[memberId] || userData.role || 'user';
            membersData.push({ id: memberId, ...userData, role: memberRole });
          }
        }
        setGroupMembers(membersData);
      }
    } catch (err) {
      console.error('Failed to fetch group members:', err);
    }
  };

  const handleViewGroupMembers = async (group) => {
    setSelectedGroupForMembers(group);
    await fetchGroupMembers(group.id);
    setShowGroupMembers(true);
  };

  const handleAddParticipant = async (groupId, userId, userName, groupName) => {
    setAddingMember(true);
    try {
      // Get the user's global role from their document
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userGlobalRole = userData.role || 'user';
      
      const groupRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (!groupDoc.exists()) {
        alert('Group not found');
        return;
      }
      
      const groupData = groupDoc.data();
      const currentMembers = groupData.members || [];
      const groupRoles = groupData.groupRoles || {};
      
      if (currentMembers.includes(userId)) {
        alert('User is already a member of this group');
        return;
      }
      
      // Add user to group with their global role
      await updateDoc(groupRef, {
        members: [...currentMembers, userId],
        memberCount: (groupData.memberCount || 0) + 1,
        groupRoles: {
          ...groupRoles,
          [userId]: userGlobalRole
        }
      });
      
      if (userDoc.exists()) {
        const userGroups = userData.groups || [];
        if (!userGroups.includes(groupId)) {
          await updateDoc(userRef, {
            groups: [...userGroups, groupId]
          });
        }
      }

      // Check if user has a pending join request and remove it
      const existingRequestQuery = query(
        collection(db, 'joinRequests'),
        where('userId', '==', userId),
        where('groupId', '==', groupId),
        where('status', '==', 'pending')
      );
      const existingRequestSnap = await getDocs(existingRequestQuery);
      
      if (!existingRequestSnap.empty) {
        // Delete the pending request
        const requestId = existingRequestSnap.docs[0].id;
        await updateDoc(doc(db, 'joinRequests', requestId), {
          status: 'auto-approved',
          approvedAt: new Date()
        });
      }
      
      alert(`Successfully added ${userName} to ${groupName}`);
      
      await fetchGroups();
      await fetchUsers();
      await fetchJoinRequests(); // Refresh join requests to remove the approved one
      
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
      // Get the user's global role from their document
      const userRef = doc(db, 'users', request.userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      const userGlobalRole = userData.role || 'user';
      
      const groupRef = doc(db, 'groups', request.groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const currentMembers = groupDoc.data().members || [];
        const groupRoles = groupDoc.data().groupRoles || {};
        
        if (!currentMembers.includes(request.userId)) {
          // Add user to group members with their global role
          await updateDoc(groupRef, {
            members: [...currentMembers, request.userId],
            memberCount: (groupDoc.data().memberCount || 0) + 1,
            groupRoles: {
              ...groupRoles,
              [request.userId]: userGlobalRole // Use user's global role
            }
          });
        }
      }
      
      if (userDoc.exists()) {
        const userGroups = userData.groups || [];
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
    (u.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.surname?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchMember.toLowerCase())) &&
    !(selectedGroupForAdd && groups.find(g => g.id === selectedGroupForAdd)?.members?.includes(u.id))
  );

  const handleSendRequest = async (group) => {
    if (!user) {
      alert('Please log in to send a join request');
      return;
    }
    
    setSendingRequest(group.id);
    try {
      // Check if there's already a pending request
      const existingRequestQuery = query(
        collection(db, 'joinRequests'),
        where('userId', '==', user.uid),
        where('groupId', '==', group.id),
        where('status', '==', 'pending')
      );
      const existingRequestSnap = await getDocs(existingRequestQuery);
      
      if (!existingRequestSnap.empty) {
        alert('You already have a pending request for this group');
        return;
      }
      
      // Get user details
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      
      // Create join request
      await addDoc(collection(db, 'joinRequests'), {
        userId: user.uid,
        userName: userData.name || user.email,
        userEmail: user.email,
        groupId: group.id,
        groupName: group.groupName || group.name,
        status: 'pending',
        requestedAt: new Date()
      });
      
      alert(`Join request sent for ${group.groupName || group.name}`);
      await fetchUserPendingRequests();
      // Also refresh join requests so admins/treasurers can see it
      await fetchJoinRequests();
    } catch (err) {
      console.error('Failed to send request:', err);
      alert('Failed to send request. Please try again.');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleCancelRequest = async (groupId, groupName) => {
    setSendingRequest(groupId);
    try {
      // Find the pending request for this group
      const request = userPendingRequests.find(r => r.groupId === groupId);
      if (request) {
        await updateDoc(doc(db, 'joinRequests', request.id), {
          status: 'cancelled',
          cancelledAt: new Date()
        });
        alert(`Request cancelled for ${groupName}`);
        await fetchUserPendingRequests();
      }
    } catch (err) {
      console.error('Failed to cancel request:', err);
      alert('Failed to cancel request. Please try again.');
    } finally {
      setSendingRequest(null);
    }
  };

  const handleViewGroupOverview = async (group) => {
    setSelectedGroupOverview(group);
    setMembersPage(1); // Reset members pagination
    setMyGroupsPage(1); // Reset my groups pagination
    setOtherGroupsPage(1); // Reset other groups pagination
    await fetchGroupMembers(group.id);
    setShowGroupOverview(true);
  };

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

  // View Group Members Modal
  if (showGroupMembers && selectedGroupForMembers) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => {
                setShowGroupMembers(false);
                setSelectedGroupForMembers(null);
                setGroupMembers([]);
              }}
            >
              ← Back to Groups
            </button>
          </div>

          <div className="section-card">
            <h2>{selectedGroupForMembers.groupName || selectedGroupForMembers.name}</h2>
            <h3>👥 Group Members ({groupMembers.length})</h3>
            
            {groupMembers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No members in this group yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {groupMembers.map((member, index) => (
                  <div 
                    key={member.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: member.id === user?.uid ? '#f0f9ff' : 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className={`badge ${
                        member.role === 'admin' ? 'badge-danger' :
                        member.role === 'treasurer' ? 'badge-warning' : 'badge-info'
                      }`}>
                        {member.role || 'user'}
                      </span>
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

  // Group Overview Modal (for all users - members and non-members)
  if (showGroupOverview && selectedGroupOverview) {
    const isMember = isUserMemberOfGroup(selectedGroupOverview);
    
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => {
                setShowGroupOverview(false);
                setSelectedGroupOverview(null);
                setGroupMembers([]);
              }}
            >
              ← Back to Groups
            </button>
          </div>

          <div className="section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{selectedGroupOverview.groupName || selectedGroupOverview.name}</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {selectedGroupOverview.description}
                </p>
              </div>
              {isMember && (
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/group/${selectedGroupOverview.id}?action=pay`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  Pay R{selectedGroupOverview.contributionAmount || 0} Now
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Members</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{groupMembers.length} / {selectedGroupOverview.maxMembers || '∞'}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Contribution</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>R{selectedGroupOverview.contributionAmount || 0}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Payout Cycle</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedGroupOverview.meetingFrequency || 'Monthly'}</div>
              </div>
              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Duration</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedGroupOverview.duration || 12} months</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <h3>Members ({groupMembers.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {groupMembers.length > 0 && (() => {
                  const totalPages = Math.ceil(groupMembers.length / membersPerPage);
                  const startIndex = (membersPage - 1) * membersPerPage;
                  const paginatedMembers = groupMembers.slice(startIndex, startIndex + membersPerPage);
                  
                  return (
                    <>
                      {paginatedMembers.map((member) => (
                        <div 
                          key={member.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            backgroundColor: member.id === user?.uid ? '#f0f9ff' : 'white',
                            border: '1px solid var(--border)',
                            borderRadius: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
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
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {member.email}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: member.role === 'admin' ? '#fee2e2' : member.role === 'treasurer' ? '#fef3c7' : '#d1fae5',
                              color: member.role === 'admin' ? '#dc2626' : member.role === 'treasurer' ? '#d97706' : '#059669',
                              textTransform: 'capitalize'
                            }}>
                              {member.role || 'user'}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                          <button 
                            className="btn btn-outline"
                            onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                            disabled={membersPage === 1}
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            ← Previous
                          </button>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Page {membersPage} of {totalPages}
                          </span>
                          <button 
                            className="btn btn-outline"
                            onClick={() => setMembersPage(p => Math.min(totalPages, p + 1))}
                            disabled={membersPage === totalPages}
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            Next →
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
                {groupMembers.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    No members in this group yet
                  </p>
                )}
              </div>
            </div>

            {/* Show different buttons for members vs non-members */}
            {isMember ? (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {isAdmin && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate(`/configure-group/${selectedGroupOverview.id}`)}
                  >
                    Configure Group
                  </button>
                )}
                {(isAdmin || isTreasurer) && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedGroupForAdd(selectedGroupOverview.id);
                      setShowGroupOverview(false);
                      setShowAddParticipant(true);
                    }}
                  >
                    + Add Participant
                  </button>
                )}
              </div>
            ) : (
              userPendingRequests.some(r => r.groupId === selectedGroupOverview.id) ? (
                <button 
                  className="btn btn-danger"
                  onClick={() => handleCancelRequest(selectedGroupOverview.id, selectedGroupOverview.groupName || selectedGroupOverview.name)}
                  disabled={sendingRequest === selectedGroupOverview.id}
                >
                  {sendingRequest === selectedGroupOverview.id ? 'Cancelling...' : 'Cancel Request'}
                </button>
              ) : (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleSendRequest(selectedGroupOverview)}
                  disabled={sendingRequest === selectedGroupOverview.id}
                >
                  {sendingRequest === selectedGroupOverview.id ? 'Sending...' : 'Request to Join'}
                </button>
              )
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

        {/* Action buttons - Show for users who are members of any group */}
        {myGroups.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {(isAdmin || isTreasurer) && (
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
            )}
          </div>
        )}

        {loading ? (
          <p>Loading groups...</p>
        ) : (
          <>
            {/* My Groups Section - Groups user is a member of */}
            <div className="section-card" style={{ marginBottom: '2rem' }}>
              <h3>My Groups ({myGroups.length})</h3>
              
              {myGroups.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  You are not a member of any groups yet. Browse "Other Groups" to join one.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                      const totalPages = Math.ceil(myGroups.length / groupsPerPage);
                      const startIndex = (myGroupsPage - 1) * groupsPerPage;
                      const paginatedGroups = myGroups.slice(startIndex, startIndex + groupsPerPage);
                      
                      return paginatedGroups.map(group => (
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
                            
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {/* View Group Button - Shows overview */}
                              <button 
                                className="btn btn-outline"
                                onClick={() => handleViewGroupOverview(group)}
                              >
                                View Group
                              </button>
                              
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
                      ));
                    })()}
                  </div>
                  
                  {/* My Groups Pagination */}
                  {myGroups.length > groupsPerPage && (() => {
                    const totalPages = Math.ceil(myGroups.length / groupsPerPage);
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button 
                          className="btn btn-outline"
                          onClick={() => setMyGroupsPage(p => Math.max(1, p - 1))}
                          disabled={myGroupsPage === 1}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Page {myGroupsPage} of {totalPages}
                        </span>
                        <button 
                          className="btn btn-outline"
                          onClick={() => setMyGroupsPage(p => Math.min(totalPages, p + 1))}
                          disabled={myGroupsPage === totalPages}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Next →
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {/* Other Groups Section - Groups user is not a member of */}
            <div className="section-card">
              <h3>Other Groups ({otherGroups.length})</h3>
              
              {otherGroups.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No other groups available to join.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(() => {
                      const totalPages = Math.ceil(otherGroups.length / groupsPerPage);
                      const startIndex = (otherGroupsPage - 1) * groupsPerPage;
                      const paginatedGroups = otherGroups.slice(startIndex, startIndex + groupsPerPage);
                      
                      return paginatedGroups.map(group => (
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
                              {/* View Group - Shows overview for non-members */}
                              <button 
                                className="btn btn-outline"
                                onClick={() => handleViewGroupOverview(group)}
                              >
                                Overview
                              </button>
                              
                              {/* Request to Join / Cancel Request button */}
                              {userPendingRequests.some(r => r.groupId === group.id) ? (
                                <button 
                                  className="btn btn-danger"
                                  onClick={() => handleCancelRequest(group.id, group.groupName || group.name)}
                                  disabled={sendingRequest === group.id}
                                >
                                  {sendingRequest === group.id ? 'Cancelling...' : 'Cancel Request'}
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-primary"
                                  onClick={() => handleSendRequest(group)}
                                  disabled={sendingRequest === group.id}
                                >
                                  {sendingRequest === group.id ? 'Sending...' : 'Request to Join'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  
                  {/* Other Groups Pagination */}
                  {otherGroups.length > groupsPerPage && (() => {
                    const totalPages = Math.ceil(otherGroups.length / groupsPerPage);
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button 
                          className="btn btn-outline"
                          onClick={() => setOtherGroupsPage(p => Math.max(1, p - 1))}
                          disabled={otherGroupsPage === 1}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          ← Previous
                        </button>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Page {otherGroupsPage} of {totalPages}
                        </span>
                        <button 
                          className="btn btn-outline"
                          onClick={() => setOtherGroupsPage(p => Math.min(totalPages, p + 1))}
                          disabled={otherGroupsPage === totalPages}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Next →
                        </button>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default BrowseGroupsPage;