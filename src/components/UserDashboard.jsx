import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
} from "firebase/firestore";
import MyGroups from "../components/MyGroups";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [requestingGroupId, setRequestingGroupId] = useState(null);
  const [messageMap, setMessageMap] = useState({});
  const [showBrowseGroups, setShowBrowseGroups] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Demo data for dashboard
  const [paymentHistory, setPaymentHistory] = useState([
    { id: 1, amount: 500, date: "2025-03-05", status: "successful" },
    { id: 2, amount: 500, date: "2025-02-05", status: "successful" },
    { id: 3, amount: 500, date: "2025-01-05", status: "successful" },
    { id: 4, amount: 500, date: "2024-12-05", status: "successful" },
  ]);

  const [upcomingPayments, setUpcomingPayments] = useState([
    { id: 1, amount: 500, dueDate: "2025-05-05", status: "pending" },
    { id: 2, amount: 500, dueDate: "2025-06-05", status: "pending" },
    { id: 3, amount: 500, dueDate: "2025-07-05", status: "pending" },
  ]);

  useEffect(() => {
    if (showBrowseGroups) {
      fetchAvailableGroups();
      fetchUserGroups();
      fetchPendingRequests();
    }
  }, [showBrowseGroups, user]);

  const fetchAvailableGroups = async () => {
    setLoadingGroups(true);
    try {
      const groupsSnap = await getDocs(collection(db, "groups"));
      const allGroups = groupsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filter to only show groups user is NOT a member of
      const availableGroups = allGroups.filter(
        (group) => !userGroups.includes(group.id),
      );
      setGroups(availableGroups);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      setMessageMap({ error: { type: "error", text: err.message } });
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchUserGroups = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserGroups(userData.groups || []);
      }
    } catch (err) {
      console.error("Failed to fetch user groups:", err);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    try {
      const requestsQuery = query(
        collection(db, "joinRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
      );
      const requestsSnap = await getDocs(requestsQuery);
      const requestsData = requestsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingRequests(requestsData);
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
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
    setTimeout(() => {
      clearMessage(groupId);
    }, 4000);
  };

  const handleJoinRequest = async (groupId, groupName) => {
    if (!user) {
      setMessage(groupId, "error", "Please log in to request to join");
      return;
    }

    if (requestingGroupId === groupId) return;
    setRequestingGroupId(groupId);

    try {
      // Check if user is already a member
      if (userGroups.includes(groupId)) {
        setMessage(groupId, "error", "You are already a member of this group");
        return;
      }

      // Check if request already pending
      const alreadyPending = pendingRequests.some(
        (req) => req.groupId === groupId,
      );
      if (alreadyPending) {
        setMessage(
          groupId,
          "error",
          "You already have a pending request for this group",
        );
        return;
      }

      // Get user data
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Create join request
      const requestData = {
        groupId: groupId,
        groupName: groupName,
        userId: user.uid,
        userName: userData.name || user.displayName || user.email,
        userSurname: userData.surname || "",
        userFullName: `${userData.name || ""} ${userData.surname || ""}`.trim(),
        userEmail: user.email,
        status: "pending",
        requestedAt: new Date(),
      };

      await addDoc(collection(db, "joinRequests"), requestData);

      setMessage(
        groupId,
        "success",
        "Join request sent to admin! You'll be notified when approved.",
      );

      // Refresh pending requests
      await fetchPendingRequests();
    } catch (err) {
      console.error("Failed to send join request:", err);
      setMessage(
        groupId,
        "error",
        err.message || "Failed to send request. Please try again.",
      );
    } finally {
      setRequestingGroupId(null);
    }
  };

  const handleBack = () => {
    setShowBrowseGroups(false);
  };

  const totalPaid = paymentHistory.reduce((sum, p) => sum + p.amount, 0);
  const nextPayment = upcomingPayments[0]?.dueDate || "No upcoming payments";

  if (showBrowseGroups) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          {/* Back button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              className="btn btn-outline"
              onClick={handleBack}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>

          {/* Browse Groups Section */}
          <div className="section-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text)",
                }}
              >
                Available Stokvel Groups
              </span>
              {pendingRequests.length > 0 && (
                <span className="badge badge-warning">
                  {pendingRequests.length} pending request(s)
                </span>
              )}
            </div>

            {loadingGroups ? (
              <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
                Loading groups...
              </p>
            ) : groups.length === 0 ? (
              <p style={{ color: "var(--text-muted)", padding: "1rem 0" }}>
                No groups available to join.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {groups.map((group) => {
                  const msg = messageMap[group.id];
                  const isRequesting = requestingGroupId === group.id;
                  const isFull =
                    (group.members?.length || 0) >=
                    (group.maxMembers || Infinity);
                  const isMember = userGroups.includes(group.id);
                  const hasPendingRequest = pendingRequests.some(
                    (req) => req.groupId === group.id,
                  );

                  return (
                    <div
                      key={group.id}
                      className="group-row"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        border: "1px solid var(--border)",
                        borderRadius: "12px",
                        padding: "1rem 1.5rem",
                        background: "white",
                        gap: "1rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Group Info */}
                      <div style={{ flex: 2, minWidth: "200px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                            marginBottom: "0.5rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                            {group.groupName || group.name}
                          </h3>
                          {group.category && (
                            <span
                              className="badge badge-info"
                              style={{ fontSize: "0.7rem" }}
                            >
                              {group.category}
                            </span>
                          )}
                          {isMember && (
                            <span
                              className="badge badge-success"
                              style={{ fontSize: "0.7rem" }}
                            >
                              ✓ Member
                            </span>
                          )}
                          {hasPendingRequest && (
                            <span
                              className="badge badge-warning"
                              style={{ fontSize: "0.7rem" }}
                            >
                              ⏳ Pending Approval
                            </span>
                          )}
                          {isFull && !isMember && (
                            <span
                              className="badge badge-danger"
                              style={{ fontSize: "0.7rem" }}
                            >
                              Full
                            </span>
                          )}
                        </div>
                        {group.description && (
                          <p
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.875rem",
                              margin: 0,
                            }}
                          >
                            {group.description}
                          </p>
                        )}
                        {msg && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              padding: "0.5rem",
                              borderRadius: "4px",
                              background:
                                msg.type === "success" ? "#d4edda" : "#f8d7da",
                              color:
                                msg.type === "success" ? "#155724" : "#721c24",
                              fontSize: "0.875rem",
                            }}
                          >
                            {msg.text}
                          </div>
                        )}
                      </div>

                      {/* Group Details */}
                      <div
                        style={{
                          flex: 1,
                          minWidth: "150px",
                          display: "flex",
                          gap: "1.5rem",
                          fontSize: "0.875rem",
                        }}
                      >
                        {group.contributionAmount && (
                          <div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.75rem",
                              }}
                            >
                              Monthly
                            </div>
                            <strong>R{group.contributionAmount}</strong>
                          </div>
                        )}
                        <div>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            Members
                          </div>
                          <span>
                            {group.members?.length || 0} /{" "}
                            {group.maxMembers || "∞"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ minWidth: "160px" }}>
                        {isMember ? (
                          <button
                            className="btn btn-success"
                            style={{ width: "100%" }}
                            onClick={() => navigate(`/group/${group.id}`)}
                          >
                            View Group
                          </button>
                        ) : hasPendingRequest ? (
                          <button
                            className="btn btn-outline"
                            style={{ width: "100%" }}
                            disabled
                          >
                            Request Pending
                          </button>
                        ) : isFull ? (
                          <button
                            className="btn btn-outline"
                            style={{ width: "100%" }}
                            disabled
                          >
                            Group Full
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ width: "100%" }}
                            onClick={() =>
                              handleJoinRequest(
                                group.id,
                                group.groupName || group.name,
                              )
                            }
                            disabled={isRequesting}
                          >
                            {isRequesting
                              ? "Sending Request..."
                              : "Request to Join"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        {/* Header */}
        <div className="dashboard-header">
          <h2>My Dashboard</h2>
          <p>Track your stokvel savings and upcoming contributions.</p>
        </div>

        {/* Browse Groups Button */}
        {/* Buttons row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Browse Groups Button */}
          <button
            className="btn btn-primary"
            onClick={() => setShowBrowseGroups(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Browse Available Groups
          </button>

          {/* Notification Bell Button */}
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/notifications")}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <svg
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Notifications
            </button>

            {/* Red badge — hardcoded to 0 for now, will update once feed is fetched */}
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#dc2626",
                color: "#fff",
                fontSize: "0.65rem",
                fontWeight: 700,
                minWidth: "18px",
                height: "18px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--bg)",
                padding: "0 3px",
              }}
            >
              ?
            </span>
          </div>
        </div>

        {/* Stats cards */}
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Total Paid</div>
            <div className="stat-value">R{totalPaid}</div>
            <div className="stat-sub">since joining</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Next Payment</div>
            <div className="stat-value">
              {new Date(nextPayment).toLocaleDateString()}
            </div>
            <div className="stat-sub">
              amount: R{upcomingPayments[0]?.amount}
            </div>
          </div>
          <div className="stat-card accent-warn">
            <div className="stat-label">My Groups</div>
            <div className="stat-value">{userGroups.length}</div>
            <div className="stat-sub">active memberships</div>
          </div>
        </div>

        {/* My Groups Section */}
        <div className="section-card" style={{ marginBottom: "2rem" }}>
          <h3>📋 My Groups</h3>
          <MyGroups />
        </div>

        {/* Upcoming payments */}
        <div className="section-card" style={{ marginBottom: "2rem" }}>
          <h3>📆 Upcoming Payments</h3>
          {upcomingPayments.length === 0 ? (
            <p>No upcoming payments. You're all caught up!</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingPayments.map((p) => (
                    <tr key={p.id}>
                      <td>R{p.amount}</td>
                      <td>{new Date(p.dueDate).toLocaleDateString()}</td>
                      <td>
                        <span className="badge badge-warning">pending</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment history */}
        <div className="section-card">
          <h3>📜 Payment History</h3>
          {paymentHistory.length === 0 ? (
            <p>No payments yet. Make your first contribution!</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.date).toLocaleDateString()}</td>
                      <td>R{p.amount}</td>
                      <td>
                        <span className="badge badge-success">
                          ✓ {p.status}
                        </span>
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
};

export default UserDashboard;
