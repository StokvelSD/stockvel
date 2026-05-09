import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

// ── Helpers

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

// ── VIEW 3 — Announcement detail

function AnnouncementDetail({ item, onBack }) {
  const date = item.createdAt ? fmtFirestore(item.createdAt) : null;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="btn btn-outline notif-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Announcement</h2>
      </div>

      <div className="detail-card detail-card--announcement">
        {/* colour band top */}
        <div className="detail-band detail-band--announcement" />

        <div className="detail-body">
          {/* group pill */}
          <span className="detail-group-pill">{item.groupName}</span>

          {/* title */}
          <h1 className="detail-title">{item.title}</h1>

          {/* date row */}
          {date && (
            <div className="detail-meta-row">
              <span className="detail-meta-icon">📅</span>
              <span className="detail-meta-text">
                {fmtFull(date)} &mdash; {fmtTime(date)}
              </span>
            </div>
          )}

          <hr className="detail-divider" />

          {/* message body */}
          <p className="detail-message">{item.message}</p>
        </div>
      </div>
    </div>
  );
}

// ── VIEW 3 — Meeting detail ───────

function MeetingDetail({ item, onBack }) {
  const upcoming = isUpcoming(item.date);

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button className="btn btn-outline notif-back-btn" onClick={onBack}>
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Meeting details</h2>
      </div>

      <div className="detail-card detail-card--meeting">
        {/* colour band top */}
        <div className="detail-band detail-band--meeting" />

        <div className="detail-body">
          {/* group pill + status */}
          <div className="detail-top-row">
            <span className="detail-group-pill">{item.groupName}</span>
            <span
              className={`meeting-status-badge ${
                upcoming ? "status-upcoming" : "status-past"
              }`}
            >
              {upcoming ? "Upcoming" : "Already happened"}
            </span>
          </div>

          {/* title */}
          <h1 className="detail-title">{item.title}</h1>

          <hr className="detail-divider" />

          {/* info grid */}
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

// ── VIEW 2 — Group detail (announcements + meetings list) ─────────────────────

function GroupDetail({ group, announcements, meetings, onBack, onSelectItem }) {
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
            {announcements.map((a) => (
              <div
                key={a.id}
                className="feed-item announcement feed-item--clickable"
                onClick={() => onSelectItem({ type: "announcement", data: a })}
              >
                <div className="feed-item-title">{a.title}</div>
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
            ))}
          </div>
        )}
      </div>

      {/* Meetings */}
      <div className="section-card">
        <h3>Meetings</h3>
        {meetings.length === 0 ? (
          <p className="feed-empty">No meetings scheduled.</p>
        ) : (
          <div className="feed-list">
            {meetings.map((m) => {
              const upcoming = isUpcoming(m.date);
              return (
                <div
                  key={m.id}
                  className="feed-item meeting feed-item--clickable"
                  onClick={() => onSelectItem({ type: "meeting", data: m })}
                >
                  <div className="feed-item-title">{m.title}</div>
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
                        className={`meeting-status-badge ${
                          upcoming ? "status-upcoming" : "status-past"
                        }`}
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

// ── VIEW 1 — Group list ───────────

function GroupList({ groups, allAnnouncements, allMeetings, onSelectGroup }) {
  const announcementCount = (groupId) =>
    allAnnouncements.filter((a) => a.groupId === groupId).length;
  const meetingCount = (groupId) =>
    allMeetings.filter((m) => m.groupId === groupId).length;

  return (
    <div className="group-list">
      {groups.map((g) => {
        const aCount = announcementCount(g.groupId);
        const mCount = meetingCount(g.groupId);
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
              <div className="group-list-name">{g.groupName}</div>
              <div className="group-list-sub">
                {aCount > 0 &&
                  `${aCount} announcement${aCount !== 1 ? "s" : ""}`}
                {aCount > 0 && mCount > 0 && " · "}
                {mCount > 0 && `${mCount} meeting${mCount !== 1 ? "s" : ""}`}
              </div>
            </div>
            <div className="group-list-badges">
              {aCount > 0 && (
                <span className="group-badge badge-ann">{aCount} new</span>
              )}
              {mCount > 0 && (
                <span className="group-badge badge-meet">
                  {mCount} meeting{mCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <span className="group-list-chevron">›</span>
          </div>
        );
      })}
    </div>
  );
}

// ── ROOT EXPORT

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  // Navigation state: null | { groupId, groupName } | { type, data }
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'announcement'|'meeting', data }

  useEffect(() => {
    if (!user) return;
    fetchUserFeed();
  }, [user]);

  const fetchUserFeed = async () => {
    setLoadingFeed(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const groupIds = userData.groups || [];
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
    } catch (err) {
      console.error("fetchUserFeed error:", err);
    } finally {
      setLoadingFeed(false);
    }
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

  // ── Detail view (level 3) ──
  if (selectedItem) {
    const onBack = () => setSelectedItem(null);
    if (selectedItem.type === "announcement") {
      return <AnnouncementDetail item={selectedItem.data} onBack={onBack} />;
    }
    return <MeetingDetail item={selectedItem.data} onBack={onBack} />;
  }

  // ── Group detail view (level 2) ──
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
        onBack={() => setSelectedGroup(null)}
        onSelectItem={setSelectedItem}
      />
    );
  }

  // ── Group list view (level 1) ──
  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button
          className="btn btn-outline notif-back-btn"
          onClick={() => navigate("/dashboard")}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Notifications</h2>
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
            onSelectGroup={setSelectedGroup}
          />
        )}
      </div>
    </div>
  );
}

export default Notifications;
