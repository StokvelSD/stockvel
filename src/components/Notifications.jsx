import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

// ── localStorage helpers

function getSeenIds(uid) {
  try {
    const raw = localStorage.getItem(`notif_seen_${uid}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(uid, ids) {
  try {
    const current = getSeenIds(uid);
    ids.forEach((id) => current.add(id));
    localStorage.setItem(`notif_seen_${uid}`, JSON.stringify([...current]));
  } catch {}
}

// ── Date helpers

function fmtShort(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtFull(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtFirestore(ts) {
  return new Date(ts._seconds * 1000);
}

function isUpcoming(dateStr) {
  return new Date(dateStr) > new Date();
}

// ── Unread dot ──

function UnreadDot() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "#dc2626",
        flexShrink: 0,
      }}
    />
  );
}

// ── VIEW 3 — Announcement detail ──────

function AnnouncementDetail({ item, onBack }) {
  const { user } = useAuth();
  const date = item.createdAt ? fmtFirestore(item.createdAt) : null;

  // Mark as read when detail opens
  useEffect(() => {
    if (user && item.id) markSeen(user.uid, [item.id]);
  }, [user, item.id]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="btn btn-outline notif-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Announcement</h2>
      </div>

      <div className="detail-card detail-card--announcement">
        <div className="detail-band detail-band--announcement" />
        <div className="detail-body">
          <span className="detail-group-pill">{item.groupName}</span>
          <h1 className="detail-title">{item.title}</h1>
          {date && (
            <div className="detail-meta-row">
              <span className="detail-meta-icon">📅</span>
              <span className="detail-meta-text">
                {fmtFull(date)} &mdash; {fmtTime(date)}
              </span>
            </div>
          )}
          <hr className="detail-divider" />
          <p className="detail-message">{item.message}</p>
        </div>
      </div>
    </div>
  );
}

// ── VIEW 3 — Meeting detail ───

function MeetingDetail({ item, onBack }) {
  const { user } = useAuth();
  const upcoming = isUpcoming(item.date);

  // Mark as read when detail opens
  useEffect(() => {
    if (user && item.id) markSeen(user.uid, [item.id]);
  }, [user, item.id]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="btn btn-outline notif-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Meeting details</h2>
      </div>

      <div className="detail-card detail-card--meeting">
        <div className="detail-band detail-band--meeting" />
        <div className="detail-body">
          <div className="detail-top-row">
            <span className="detail-group-pill">{item.groupName}</span>
            <span
              className={`meeting-status-badge ${upcoming ? "status-upcoming" : "status-past"}`}
            >
              {upcoming ? "Upcoming" : "Already happened"}
            </span>
          </div>

          <h1 className="detail-title">{item.title}</h1>
          <hr className="detail-divider" />

          <div className="detail-info-grid">
            {item.date && (
              <>
                <div className="detail-info-block">
                  <span className="detail-info-label">Date</span>
                  <span className="detail-info-value">
                    {fmtFull(item.date)}
                  </span>
                </div>
                <div className="detail-info-block">
                  <span className="detail-info-label">Time</span>
                  <span className="detail-info-value">
                    {fmtTime(item.date)}
                  </span>
                </div>
              </>
            )}
            {item.location && (
              <div className="detail-info-block detail-info-block--full">
                <span className="detail-info-label">Location</span>
                <span className="detail-info-value">{item.location}</span>
              </div>
            )}
          </div>

          {item.agenda && (
            <>
              <hr className="detail-divider" />
              <div className="detail-agenda">
                <span className="detail-info-label">Agenda</span>
                <p className="detail-message" style={{ marginTop: "0.5rem" }}>
                  {item.agenda}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── VIEW 2 — Group detail ─────

function GroupDetail({
  group,
  announcements,
  meetings,
  seenIds,
  onBack,
  onSelectItem,
}) {
  // Mark all items in this group as seen when the group detail opens
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const ids = [
      ...announcements.map((a) => a.id),
      ...meetings.map((m) => m.id),
    ].filter(Boolean);
    markSeen(user.uid, ids);
  }, [user, announcements, meetings]);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="btn btn-outline notif-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>{group.groupName}</h2>
      </div>

      {/* Announcements */}
      <div className="section-card">
        <h3>Announcements</h3>
        {announcements.length === 0 ? (
          <p className="feed-empty">No announcements yet.</p>
        ) : (
          <div className="feed-list">
            {announcements.map((a) => {
              const unread = !seenIds.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`feed-item announcement feed-item--clickable${unread ? " feed-item--unread" : ""}`}
                  onClick={() =>
                    onSelectItem({ type: "announcement", data: a })
                  }
                >
                  <div className="feed-item-title-row">
                    {unread && <UnreadDot />}
                    <span className="feed-item-title">{a.title}</span>
                  </div>
                  <div className="feed-item-message feed-item-message--clamp">
                    {a.message}
                  </div>
                  <div className="feed-item-footer-row">
                    <div className="feed-item-date">
                      {a.createdAt ? fmtShort(fmtFirestore(a.createdAt)) : ""}
                    </div>
                    <span className="feed-item-read-more">View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Meetings */}
      <div className="section-card">
        <h3>Scheduled meetings</h3>
        {meetings.length === 0 ? (
          <p className="feed-empty">No meetings scheduled.</p>
        ) : (
          <div className="feed-list">
            {meetings.map((m) => {
              const upcoming = isUpcoming(m.date);
              const unread = !seenIds.has(m.id);
              return (
                <div
                  key={m.id}
                  className={`feed-item meeting feed-item--clickable${unread ? " feed-item--unread" : ""}`}
                  onClick={() => onSelectItem({ type: "meeting", data: m })}
                >
                  <div className="feed-item-title-row">
                    {unread && <UnreadDot />}
                    <span className="feed-item-title">{m.title}</span>
                  </div>
                  <div className="feed-item-meta">
                    <span className="feed-item-tag">
                      {m.location || "Location TBD"}
                    </span>
                    <span className="feed-item-tag">
                      {m.agenda || "No agenda set"}
                    </span>
                  </div>
                  <div
                    className="feed-item-footer-row"
                    style={{ marginTop: "0.35rem" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        className={`meeting-status-badge ${upcoming ? "status-upcoming" : "status-past"}`}
                      >
                        {upcoming ? "Upcoming" : "Already happened"}
                      </span>
                      <div className="feed-item-date">
                        {m.date ? fmtShort(m.date) : ""}
                      </div>
                    </div>
                    <span className="feed-item-read-more">View →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VIEW 1 — Group list ─

function GroupList({
  groups,
  allAnnouncements,
  allMeetings,
  seenIds,
  onSelectGroup,
}) {
  return (
    <div className="group-list">
      {groups.map((g) => {
        const ann = allAnnouncements.filter((a) => a.groupId === g.groupId);
        const meet = allMeetings.filter((m) => m.groupId === g.groupId);
        const aCount = ann.length;
        const mCount = meet.length;
        const unreadCount =
          ann.filter((a) => !seenIds.has(a.id)).length +
          meet.filter((m) => !seenIds.has(m.id)).length;

        return (
          <div
            key={g.groupId}
            className="group-list-item"
            onClick={() => onSelectGroup(g)}
          >
            <div className="group-list-avatar">
              {g.groupName.slice(0, 2).toUpperCase()}
            </div>
            <div className="group-list-info">
              <div className="group-list-name-row">
                <span className="group-list-name">{g.groupName}</span>
                {unreadCount > 0 && (
                  <span className="group-unread-count">{unreadCount} new</span>
                )}
              </div>
              <div className="group-list-sub">
                {aCount > 0 &&
                  `${aCount} announcement${aCount !== 1 ? "s" : ""}`}
                {aCount > 0 && mCount > 0 && " · "}
                {mCount > 0 && `${mCount} meeting${mCount !== 1 ? "s" : ""}`}
              </div>
            </div>
            <div className="group-list-badges">
              {aCount > 0 && (
                <span className="group-badge badge-ann">{aCount}</span>
              )}
              {mCount > 0 && (
                <span className="group-badge badge-meet">{mCount} mtg</span>
              )}
            </div>
            <span className="group-list-chevron">›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── ROOT EXPORT ─

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Seen IDs — kept in state so unread dots update reactively after marking
  const [seenIds, setSeenIds] = useState(() =>
    user ? getSeenIds(user.uid) : new Set(),
  );

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchUserFeed = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoadingFeed(true);

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) return;
        const groupIds = userDoc.data().groups || [];
        if (groupIds.length === 0) return;

        const announcements = [];
        const meetings = [];

        for (const groupId of groupIds) {
          try {
            const res = await fetch(
              `https://stockvel-2kvp.onrender.com/api/groups/${groupId}/announcements`,
            );
            if (res.ok) {
              const data = await res.json();
              announcements.push(...data.map((a) => ({ ...a, groupId })));
            }
          } catch (err) {
            console.error(`Announcement fetch error for ${groupId}:`, err);
          }
          try {
            const res = await fetch(
              `https://stockvel-2kvp.onrender.com/api/groups/${groupId}/meetings`,
            );
            if (res.ok) {
              const data = await res.json();
              meetings.push(...data.map((m) => ({ ...m, groupId })));
            }
          } catch (err) {
            console.error(`Meeting fetch error for ${groupId}:`, err);
          }
        }

        setAllAnnouncements(announcements);
        setAllMeetings(meetings);
        // Re-sync seen IDs from storage after fetch
        setSeenIds(getSeenIds(user.uid));
      } catch (err) {
        console.error("fetchUserFeed error:", err);
      } finally {
        setLoadingFeed(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (!user) return;
    fetchUserFeed();
  }, [user, fetchUserFeed]);

  // Re-sync seenIds whenever we return to the list views so dots update
  const handleBackFromItem = () => {
    setSeenIds(getSeenIds(user.uid));
    setSelectedItem(null);
  };

  const handleBackFromGroup = () => {
    setSeenIds(getSeenIds(user.uid));
    setSelectedGroup(null);
  };

  // Derive unique groups
  const groups = (() => {
    const map = {};
    [...allAnnouncements, ...allMeetings].forEach((item) => {
      if (!map[item.groupId]) {
        map[item.groupId] = {
          groupId: item.groupId,
          groupName: item.groupName || item.groupId,
        };
      }
    });
    return Object.values(map);
  })();

  // ── Level 3 — item detail ──
  if (selectedItem) {
    if (selectedItem.type === "announcement") {
      return (
        <AnnouncementDetail
          item={selectedItem.data}
          onBack={handleBackFromItem}
        />
      );
    }
    return (
      <MeetingDetail item={selectedItem.data} onBack={handleBackFromItem} />
    );
  }

  // ── Level 2 — group detail ──
  if (selectedGroup) {
    const groupAnnouncements = allAnnouncements.filter(
      (a) => a.groupId === selectedGroup.groupId,
    );
    const groupMeetings = allMeetings.filter(
      (m) => m.groupId === selectedGroup.groupId,
    );
    return (
      <GroupDetail
        group={selectedGroup}
        announcements={groupAnnouncements}
        meetings={groupMeetings}
        seenIds={seenIds}
        onBack={handleBackFromGroup}
        onSelectItem={setSelectedItem}
      />
    );
  }

  // ── Level 1 — group list ──
  const totalUnread =
    allAnnouncements.filter((a) => !seenIds.has(a.id)).length +
    allMeetings.filter((m) => !seenIds.has(m.id)).length;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button
          className="btn btn-outline notif-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>
          Notifications
          {totalUnread > 0 && (
            <span className="notif-page-unread-badge">{totalUnread}</span>
          )}
        </h2>

        {/* Refresh button */}
        <button
          className="btn btn-outline notif-refresh-btn"
          onClick={() => fetchUserFeed(true)}
          disabled={refreshing}
          title="Refresh"
          style={{ marginLeft: "auto" }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              display: "block",
              animation: refreshing ? "spin 0.8s linear infinite" : "none",
            }}
          >
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="section-card">
        <h3>Your groups</h3>
        {loadingFeed ? (
          <p className="feed-loading">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="feed-empty">No notifications yet.</p>
        ) : (
          <GroupList
            groups={groups}
            allAnnouncements={allAnnouncements}
            allMeetings={allMeetings}
            seenIds={seenIds}
            onSelectGroup={setSelectedGroup}
          />
        )}
      </div>
    </div>
  );
}

export default Notifications;
