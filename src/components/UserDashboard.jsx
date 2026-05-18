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
import SavingsProjection from "./SavingsProjection";
import { fetchTotalPaid, fetchContributionsByGroup } from "../services/contributions";

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [requestingGroupId, setRequestingGroupId] = useState(null);
  const [messageMap, setMessageMap] = useState({});
  const [showBrowseGroups, setShowBrowseGroups] = useState(false);
  const [userGroups, setUserGroups] = useState([]);
  const [userRole, setUserRole] = useState("user");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [adminRequestPending, setAdminRequestPending] = useState(false);
  const [adminRequestDoc, setAdminRequestDoc] = useState(null);
  const [sendingAdminRequest, setSendingAdminRequest] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [sendingRequest, setSendingRequest] = useState(null);

  const[totalPaid, setTotalPaid] = useState(0);
  const[contributionCount, setContributionCount] = useState(0);
  const[groupContributions, setGroupContributions] = useState([]);
  const[loadingRealData, setLoadingRealData] = useState(true);

  const[upcomingPayments, setUpComingPayments] = useState([]);
  const[paymentHistory, setPaymentHistory] = useState([]);


  useEffect(() => {
    if (showBrowseGroups) {
      fetchAvailableGroups();
    }
  }, [showBrowseGroups, user]);

  // ── Fetch unread notification count ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return;
        const groupIds = userDoc.data().groups || [];

        // Read already-seen IDs from localStorage
        const seenRaw = localStorage.getItem(`notif_seen_${user.uid}`);
        const seenIds = seenRaw ? new Set(JSON.parse(seenRaw)) : new Set();

        let unread = 0;
        for (const groupId of groupIds) {
          try {
            const [annRes, meetRes] = await Promise.all([
              fetch(
                `https://stockvel-2kvp.onrender.com/api/groups/${groupId}/announcements`,
              ),
              fetch(
                `https://stockvel-2kvp.onrender.com/api/groups/${groupId}/meetings`,
              ),
            ]);
            if (annRes.ok) {
              const data = await annRes.json();
              data.forEach((a) => {
                if (!seenIds.has(a.id)) unread++;
              });
            }
            if (meetRes.ok) {
              const data = await meetRes.json();
              data.forEach((m) => {
                if (!seenIds.has(m.id)) unread++;
              });
            }
          } catch (_) {}
        }
        setNotificationCount(unread);
      } catch (err) {
        console.error("Failed to fetch notification count:", err);
      }
    };
    fetchCount();
  }, [user]);

  useEffect(() => {
    const loadUserGroups = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserGroups(data.groups || []);
          setUserRole(data.role || "user");
        }
      } catch (err) {
        console.error("Failed to load user groups:", err);
      }
    };
    loadUserGroups();
  }, [user]);

  useEffect(() => {
    const loadAdminRequest = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, "adminRequests"),
          where("userId", "==", user.uid),
        );
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const pending = docs.find((r) => r.status === "pending");
        setAdminRequestPending(!!pending);
        setAdminRequestDoc(pending || null);
      } catch (err) {
        console.error("Failed to load admin request:", err);
      }
    };
    loadAdminRequest();
  }, [user]);


  useEffect(() => {
    const loadRealContributionData = async () => {
      if(!user)return;
      setLoadingRealData(true);

      try{
        const {total, count, contributions} = await fetchTotalPaid();
        setTotalPaid(total);
        setContributionCount(count);
        setPaymentHistory(contributions);

        const byGroup = await fetchContributionsByGroup();
        setGroupContributions(byGroup);

        setUpComingPayments([]);
      }catch(error){
        console.error("Error loading contribution data", error);
      }finally{
        setLoadingRealData(false);
      }
    };
    loadRealContributionData();
  }, [user]);


  const fetchAvailableGroups = async () => {
    setLoadingGroups(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userGroupsData = userDoc.exists()
        ? userDoc.data().groups || []
        : [];
      setUserGroups(userGroupsData);

      const requestsQuery = query(
        collection(db, "joinRequests"),
        where("userId", "==", user.uid),
      );
      const requestsSnap = await getDocs(requestsQuery);
      const allUserRequests = requestsSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setPendingRequests(allUserRequests.filter((r) => r.status === "pending"));

      const groupsSnap = await getDocs(collection(db, "groups"));
      const allGroups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setGroups(allGroups.filter((g) => !userGroupsData.includes(g.id)));
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
      if (userDoc.exists()) setUserGroups(userDoc.data().groups || []);
    } catch (err) {
      console.error("Failed to fetch user groups:", err);
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "joinRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
      );
      const snap = await getDocs(q);
      setPendingRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
    }
  };

  const clearMessage = (groupId) => {
    setMessageMap((prev) => {
      const u = { ...prev };
      delete u[groupId];
      return u;
    });
  };

  const setMessage = (groupId, type, text) => {
    setMessageMap((prev) => ({ ...prev, [groupId]: { type, text } }));
    setTimeout(() => clearMessage(groupId), 4000);
  };

  const handleJoinRequest = async (groupId, groupName) => {
    if (!user) {
      setMessage(groupId, "error", "Please log in to request to join");
      return;
    }
    if (requestingGroupId === groupId) return;
    setRequestingGroupId(groupId);
    try {
      if (userGroups.includes(groupId)) {
        setMessage(groupId, "error", "You are already a member of this group");
        return;
      }
      if (pendingRequests.some((r) => r.groupId === groupId)) {
        setMessage(
          groupId,
          "error",
          "You already have a pending request for this group",
        );
        return;
      }
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      await addDoc(collection(db, "joinRequests"), {
        groupId,
        groupName,
        userId: user.uid,
        userName: userData.name || user.displayName || user.email,
        userSurname: userData.surname || "",
        userFullName: `${userData.name || ""} ${userData.surname || ""}`.trim(),
        userEmail: user.email,
        status: "pending",
        requestedAt: new Date(),
      });
      setMessage(
        groupId,
        "success",
        "Join request sent to admin! You'll be notified when approved.",
      );
      await fetchPendingRequests();
    } catch (err) {
      setMessage(
        groupId,
        "error",
        err.message || "Failed to send request. Please try again.",
      );
    } finally {
      setRequestingGroupId(null);
    }
  };

  const handleCancelRequest = async (groupId, groupName) => {
    setSendingRequest(groupId);
    try {
      const request = pendingRequests.find((r) => r.groupId === groupId);
      if (request) {
        await updateDoc(doc(db, "joinRequests", request.id), {
          status: "cancelled",
          cancelledAt: new Date(),
        });
        setMessage(groupId, "success", `Request cancelled for ${groupName}`);
        await fetchAvailableGroups();
      }
    } catch (err) {
      setMessage(
        groupId,
        "error",
        "Failed to cancel request. Please try again.",
      );
    } finally {
      setSendingRequest(null);
    }
  };

  const handleRequestAdmin = async () => {
    if (!user) {
      setMessage("admin", "error", "Please log in to request admin role");
      return;
    }
    if (adminRequestPending) {
      setMessage("admin", "error", "You already have a pending admin request");
      return;
    }
    setSendingAdminRequest(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const docRef = await addDoc(collection(db, "adminRequests"), {
        userId: user.uid,
        userName: userData.name || user.displayName || user.email,
        userEmail: user.email,
        status: "pending",
        requestedAt: new Date(),
      });
      setAdminRequestPending(true);
      setAdminRequestDoc({ id: docRef.id, userId: user.uid, status: "pending" });
      setMessage("admin", "success", "Admin request sent. An admin will review it.");
    } catch (err) {
      console.error("Failed to request admin:", err);
      setMessage("admin", "error", "Failed to send admin request. Please try again.");
    } finally {
      setSendingAdminRequest(false);
    }
  };

  const handleCancelAdminRequest = async () => {
    if (!adminRequestDoc) return;
    setSendingAdminRequest(true);
    try {
      await updateDoc(doc(db, "adminRequests", adminRequestDoc.id), {
        status: "cancelled",
        cancelledAt: new Date(),
      });
      setAdminRequestPending(false);
      setAdminRequestDoc(null);
      setMessage("admin", "success", "Admin request cancelled.");
    } catch (err) {
      console.error("Failed to cancel admin request:", err);
      setMessage("admin", "error", "Failed to cancel admin request.");
    } finally {
      setSendingAdminRequest(false);
    }
  };

  const nextPaymentDate = upcomingPayments[0]?.dueDate || "No upcoming payments";
  const nextPaymentAmount = upcomingPayments[0]?.amount|| 0;

  if (showBrowseGroups) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowBrowseGroups(false)}
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
                    (r) => r.groupId === group.id,
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
                            className="btn btn-danger"
                            style={{ width: "100%" }}
                            onClick={() =>
                              handleCancelRequest(
                                group.id,
                                group.groupName || group.name,
                              )
                            }
                            disabled={sendingRequest === group.id}
                          >
                            {sendingRequest === group.id
                              ? "Cancelling..."
                              : "Cancel Request"}
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
        <div className="dashboard-header">
          <h2>My Dashboard</h2>
          <p>Track your stokvel savings and upcoming contributions.</p>
        </div>

        <SavingsProjection userBalance={totalPaid} />

        {/* Buttons row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Browse Groups */}
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

          {/* Request Admin Role */}
          {userRole !== "admin" && (
            <div style={{ minWidth: "180px" }}>
              {adminRequestPending ? (
                <button
                  className="btn btn-danger"
                  onClick={handleCancelAdminRequest}
                  disabled={sendingAdminRequest}
                >
                  {sendingAdminRequest ? "Cancelling..." : "Cancel Admin Request"}
                </button>
              ) : (
                <button
                  className="btn btn-outline"
                  onClick={handleRequestAdmin}
                  disabled={sendingAdminRequest}
                >
                  {sendingAdminRequest ? "Sending..." : "Request Admin Role"}
                </button>
              )}
            </div>
          )}

          {/* ── Notification bell — fixed badge ── */}
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

            {/* Only render the badge when there is something to show */}
            {notificationCount > 0 && (
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
                  pointerEvents: "none",
                }}
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </div>
        </div>

        {/* Stats cards */}
        <div className="stats-grid" style={{ marginBottom: "2rem" }}>
          <div className="stat-card accent-green">
            <div className="stat-label">Total Paid</div>
            <div className="stat-value">{loadingRealData ? "Loading..." : `R${totalPaid.toLocaleString()}`}</div>
            <div className="stat-sub">{contributionCount} {contributionCount === 1 ? "payment" : "payments"}</div>
          </div>
          <div className="stat-card accent-blue">
            <div className="stat-label">Next Payment</div>
            <div className="stat-value">
              {nextPaymentDate !== "No upcoming payments" ? `amount: R${nextPaymentAmount}` : "No scheduled payments"}
            </div>
          </div>

          <div className="stat-card accent-warn">
            <div className="stat-label">My Groups</div>
            <div className="stat-value">{loadingRealData ? "..." : userGroups.length}</div>
            <div className="stat-sub">active memberships</div>
          </div>
        </div>

        {/* My Groups */}
        <div className="section-card" style={{ marginBottom: "2rem" }}>
          <h3>📋 My Groups</h3>
          <MyGroups />
        </div>

      </div>
    </div>
  );
};

export default UserDashboard;
