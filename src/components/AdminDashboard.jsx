import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where } from "firebase/firestore";
import '../index.css';

const ROLES = ['user', 'treasurer', 'admin'];

function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showBrowseGroups, setShowBrowseGroups] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState(null);
  const [searchMember, setSearchMember] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchJoinRequests();
  }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
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

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );
    } catch (err) {
      console.error('Failed to update role:', err);
      alert('Failed to update role. Please try again.');
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(u =>
    (u.name?.toLowerCase().includes(search.toLowerCase()) ||
     u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMembersForAdd = users.filter(u =>
    u.role === 'user' &&
    (u.name?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.surname?.toLowerCase().includes(searchMember.toLowerCase()) ||
     u.email?.toLowerCase().includes(searchMember.toLowerCase())) &&
    !(selectedGroupForAdd && groups.find(g => g.id === selectedGroupForAdd)?.members?.includes(u.id))
  );

  const counts = {
    total: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    treasurer: users.filter(u => u.role === 'treasurer').length,
    user: users.filter(u => u.role === 'user').length,
  };

  // Add Participant Modal
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

  // Browse Groups View
  if (showBrowseGroups) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => setShowBrowseGroups(false)}
            >
              ← Back to Dashboard
            </button>
          </div>

          <div className="section-card">
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              marginBottom: '1.25rem'
            }}>
              <h3 style={{ margin: 0 }}>All Groups</h3>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/create-group')}
              >
                + Create New Group
              </button>
            </div>

            {groups.length === 0 ? (
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
                      <div>
                        <h4 style={{ margin: 0 }}>{group.groupName || group.name}</h4>
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Members: {(group.members?.length || 0)} / {group.maxMembers || '∞'}
                        </p>
                        {group.contributionAmount && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                            Monthly: R{group.contributionAmount}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-outline"
                          onClick={() => {
                            setSelectedGroupForAdd(group.id);
                            setShowAddParticipant(true);
                          }}
                        >
                          Add Participant
                        </button>
                        <button 
                          className="btn btn-primary"
                          onClick={() => navigate(`/manage-group/${group.id}`)}
                        >
                          Manage
                        </button>
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

  // Join Requests View
  if (showJoinRequests) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: '1.5rem' }}>
            <button 
              className="btn btn-outline"
              onClick={() => setShowJoinRequests(false)}
            >
              ← Back to Dashboard
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
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        className="btn btn-success"
                        onClick={async () => {
                          // Approve logic here
                          const groupRef = doc(db, 'groups', request.groupId);
                          const groupDoc = await getDoc(groupRef);
                          if (groupDoc.exists()) {
                            await updateDoc(groupRef, {
                              members: [...(groupDoc.data().members || []), request.userId],
                              memberCount: (groupDoc.data().memberCount || 0) + 1
                            });
                          }
                          const userRef = doc(db, 'users', request.userId);
                          const userDoc = await getDoc(userRef);
                          if (userDoc.exists()) {
                            await updateDoc(userRef, {
                              groups: [...(userDoc.data().groups || []), request.groupId]
                            });
                          }
                          await updateDoc(doc(db, 'joinRequests', request.id), { status: 'approved' });
                          alert(`Added ${request.userName} to ${request.groupName}`);
                          window.location.reload();
                        }}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={async () => {
                          await updateDoc(doc(db, 'joinRequests', request.id), { status: 'declined' });
                          alert(`Request from ${request.userName} declined`);
                          window.location.reload();
                        }}
                      >
                        Decline
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

  // Main Dashboard
  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <h2>Admin Dashboard</h2>
          <p>Manage users, assign roles, and oversee all stokvel groups.</p>
        </div>

        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="stat-card accent-blue">
            <div className="stat-label">Total users</div>
            <div className="stat-value">{counts.total}</div>
          </div>
          <div className="stat-card accent-warn">
            <div className="stat-label">Treasurers</div>
            <div className="stat-value">{counts.treasurer}</div>
          </div>
          <div className="stat-card accent-green">
            <div className="stat-label">Members</div>
            <div className="stat-value">{counts.user}</div>
          </div>
          <div className="stat-card accent-sky">
            <div className="stat-label">Admins</div>
            <div className="stat-value">{counts.admin}</div>
          </div>
        </div>

        {/* Quick actions - THIS IS THE IMPORTANT PART */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => navigate('/create-group')}>
            Create group
          </button>
          <button className="btn btn-outline" onClick={() => setShowBrowseGroups(true)}>
            Browse groups
          </button>
          <button className="btn btn-outline" onClick={() => setShowJoinRequests(true)}>
            View Join Requests ({joinRequests.length})
          </button>
        </div>

        {/* User management table */}
        <div className="section-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>User Management</h3>
            <input
              className="form-control"
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '260px' }}
            />
          </div>

          {loading ? (
            <p>Loading users...</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.name} {u.surname}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${
                          u.role === 'admin' ? 'badge-danger' :
                          u.role === 'treasurer' ? 'badge-warning' : 'badge-info'
                        }`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-control"
                          value={u.role || 'user'}
                          disabled={updating === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;