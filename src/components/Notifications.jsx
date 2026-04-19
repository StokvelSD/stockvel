import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase/firebase";
import { doc, getDoc } from "firebase/firestore";

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchUserFeed();
  }, [user]);

  const fetchUserFeed = async () => {
    setLoadingFeed(true);
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      console.log("User doc exists:", userDoc.exists());
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const groupIds = userData.groups || [];
      console.log("Group IDs:", groupIds);

      if (groupIds.length === 0) {
        console.log("STOPPING - no groups");
        return;
      }

      const allAnnouncements = [];
      const allMeetings = [];

      for (const groupId of groupIds) {
        console.log("Fetching announcements for:", groupId);
        try {
          const announcementRes = await fetch(
            `https://stockvel-2kvp.onrender.com/api/groups/${groupId}/announcements`,
          );
          console.log("Announcement status:", announcementRes.status);
          if (announcementRes.ok) {
            const data = await announcementRes.json();
            console.log("Announcements received:", data);
            allAnnouncements.push(...data);
          }
        } catch (err) {
          console.error(`Announcement fetch error:`, err);
        }
      }
      setAnnouncements(allAnnouncements);
      setMeetings(allMeetings);
    } catch (err) {
      console.error("fetchUserFeed error:", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <button
          className="btn btn-outline"
          onClick={() => navigate("/dashboard")}
          style={{ padding: "0.35rem 0.9rem", fontSize: "0.82rem" }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Notifications</h2>
      </div>

      {/* Announcements */}
      <div className="section-card">
        <h3> Announcements</h3>
        {loadingFeed ? (
          <p className="feed-loading">Loading...</p>
        ) : announcements.length === 0 ? (
          <p className="feed-empty">No announcements yet.</p>
        ) : (
          <div className="feed-list">
            {announcements.map((a) => (
              <div key={a.id} className="feed-item announcement">
                <div className="feed-item-group">{a.groupName}</div>
                <div className="feed-item-title">{a.title}</div>
                <div className="feed-item-message">{a.message}</div>
                <div className="feed-item-date">
                  {a.createdAt
                    ? new Date(a.createdAt._seconds * 1000).toLocaleDateString(
                        "en-ZA",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meetings */}
      <div className="section-card">
        <h3>Scheduled Meetings</h3>
        {loadingFeed ? (
          <p className="feed-loading">Loading...</p>
        ) : meetings.length === 0 ? (
          <p className="feed-empty">No meetings scheduled.</p>
        ) : (
          <div className="feed-list">
            {meetings.map((m) => (
              <div key={m.id} className="feed-item meeting">
                <div className="feed-item-title">{m.title}</div>
                <div className="feed-item-meta">
                  <span className="feed-item-tag">
                    {m.location || "Location TBD"}
                  </span>
                  <span className="feed-item-tag">
                    {m.agenda || "No agenda set"}
                  </span>
                </div>
                <div className="feed-item-date">
                  {m.date
                    ? new Date(m.date._seconds * 1000).toLocaleDateString(
                        "en-ZA",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
