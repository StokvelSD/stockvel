import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import ConfigureGroup from "./ConfigureGroup";
import "../index.css";

const ROLES = ["user", "treasurer", "admin"];

function AdminPage() {
  const [showMembers, setShowMembers] = useState(false);
  const [showConfigureGroup, setShowConfigureGroup] = useState(false); // added
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showBrowseGroups, setShowBrowseGroups] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState(null);
  const [searchMember, setSearchMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchJoinRequests();
  }, []);

  const fetchUsers = async () => {
    try {
      const snap = await getDocs(collection(db, "users"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const groupsSnap = await getDocs(collection(db, "groups"));
      const groupsData = groupsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setGroups(groupsData);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const requestsQuery = query(
        collection(db, "joinRequests"),
        where("status", "==", "pending"),
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setJoinRequests(requestsData);
    } catch (err) {
      console.error("Failed to fetch join requests:", err);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId);
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err) {
      console.error("Failed to update role:", err);
      alert("Failed to update role. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const counts = {
    total: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    treasurer: users.filter((u) => u.role === "treasurer").length,
    user: users.filter((u) => u.role === "user").length,
  };

  // Configure Group View
  if (showConfigureGroup) {
    return <ConfigureGroupPage onBack={() => setShowConfigureGroup(false)} />;
  }

  // Add Participant View
  if (showAddParticipant) {
    const selectedGroup = groups.find((g) => g.id === selectedGroupForAdd);

    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <button onClick={() => setShowAddParticipant(false)}>Back</button>

          <h3>Add Participant to {selectedGroup?.groupName}</h3>

          <input
            type="text"
            placeholder="Search user..."
            value={searchMember}
            onChange={(e) => setSearchMember(e.target.value)}
          />

          {users
            .filter((u) =>
              u.name?.toLowerCase().includes(searchMember.toLowerCase()),
            )
            .map((user) => (
              <div key={user.id}>
                {user.name}
                <button>Add</button>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Join Requests View
  if (showJoinRequests) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <button onClick={() => setShowJoinRequests(false)}>Back</button>

          <h3>Join Requests ({joinRequests.length})</h3>

          {joinRequests.map((request) => (
            <div key={request.id}>
              <p>
                {request.userName} → {request.groupName}
              </p>

              <button
                onClick={async () => {
                  await updateDoc(doc(db, "joinRequests", request.id), {
                    status: "approved",
                  });
                  window.location.reload();
                }}
              >
                Approve
              </button>

              <button
                onClick={async () => {
                  await updateDoc(doc(db, "joinRequests", request.id), {
                    status: "declined",
                  });
                  window.location.reload();
                }}
              >
                Decline
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <h2>Admin Dashboard</h2>

        <div>
          <p>Total: {counts.total}</p>
          <p>Admins: {counts.admin}</p>
          <p>Treasurers: {counts.treasurer}</p>
          <p>Users: {counts.user}</p>
        </div>

        <div>
          <button onClick={() => navigate("/create-group")}>
            Create group
          </button>

          <button onClick={() => setShowBrowseGroups(true)}>
            Browse groups
          </button>

          <button onClick={() => setShowJoinRequests(true)}>
            Join Requests ({joinRequests.length})
          </button>

          <button onClick={() => setShowConfigureGroup(true)}>
            Configure group
          </button>
        </div>

        <div>
          <h3>User Management</h3>

          <input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading ? (
            <p>Loading...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        {ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
