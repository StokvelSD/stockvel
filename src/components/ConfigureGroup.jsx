import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ── Reusable Field wrapper ──
function Field({ label, children, isLast }) {
  return (
    <section className={`field ${isLast ? "field-last" : ""}`}>
      <label>{label}</label>
      {children}
    </section>
  );
}

// ── Reusable Select wrapper ──
function SelectField({ label, id, options, value, onChange, isLast }) {
  return (
    <Field label={label} isLast={isLast}>
      <section className="select-wrap">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled hidden>
            {options[0]}
          </option>
          {options.slice(1).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <span className="select-arrow">⌄</span>
      </section>
    </Field>
  );
}

// ── Per-section feedback banner ──
function SaveBanner({ feedback }) {
  if (!feedback) return null;
  return (
    <div
      className={`save-banner ${
        feedback.status === "success"
          ? "save-banner--success"
          : "save-banner--error"
      }`}
    >
      {feedback.status === "success" ? "✓ " : "✕ "}
      {feedback.message}
    </div>
  );
}

// ── Per-section card footer (divider + banner + button) ──
function CardFooter({ onSave, saving, label, feedback }) {
  return (
    <>
      <div className="card-divider" />
      <div className="card-footer">
        <SaveBanner feedback={feedback} />
        <button
          className="save-btn"
          onClick={onSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : label}
        </button>
      </div>
    </>
  );
}

// ── VIEW 2 — Configure form for a selected group ──
function ConfigureForm({ group, onBack }) {
  // ── Payout rules ──
  const [payoutOrder, setPayoutOrder] = useState(group.payoutOrder || "");
  const [latePenalty, setLatePenalty] = useState(group.latePenalty || "");
  const [gracePeriod, setGracePeriod] = useState(group.gracePeriod || "");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutFeedback, setPayoutFeedback] = useState(null);
  const [payoutErrors, setPayoutErrors] = useState({});

  // ── Meeting schedule ──
  const [meetingFreq, setMeetingFreq] = useState(group.meetingFrequency || "");
  const [meetingDay, setMeetingDay] = useState(group.meetingDay || "");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingFeedback, setMeetingFeedback] = useState(null);
  const [meetingErrors, setMeetingErrors] = useState({});

  // ── Announcement ──
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [annSaving, setAnnSaving] = useState(false);
  const [annFeedback, setAnnFeedback] = useState(null);
  const [annErrors, setAnnErrors] = useState({});

  const flash = (setter, status, message) => {
    setter({ status, message });
    setTimeout(() => setter(null), 4000);
  };

  // ── Save payout rules only ──
  const handleSavePayout = async () => {
    const e = {};
    if (!latePenalty) e.latePenalty = "This field is required.";
    if (!gracePeriod) e.gracePeriod = "This field is required.";
    setPayoutErrors(e);
    if (Object.keys(e).length > 0) return;

    setPayoutSaving(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        payoutOrder,
        latePenalty: Number(latePenalty),
        gracePeriod: Number(gracePeriod),
      });
      flash(setPayoutFeedback, "success", "Payout rules saved.");
    } catch (err) {
      flash(
        setPayoutFeedback,
        "error",
        err.message || "Failed to save payout rules.",
      );
    } finally {
      setPayoutSaving(false);
    }
  };

  // ── Save meeting only ──
  const handleSaveMeeting = async () => {
    const e = {};
    if (!meetingFreq) e.meetingFreq = "This field is required.";
    if (!meetingDay) e.meetingDay = "This field is required.";
    if (!meetingTitle) e.meetingTitle = "This field is required.";
    if (!meetingDate) e.meetingDate = "This field is required.";
    setMeetingErrors(e);
    if (Object.keys(e).length > 0) return;

    setMeetingSaving(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        meetingFrequency: meetingFreq,
        meetingDay,
      });

      const res = await fetch(
        `https://stockvel-2kvp.onrender.com/api/groups/${group.id}/schedule-meeting`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: meetingTitle,
            date: new Date(meetingDate).toISOString(),
            location: meetingLocation || "",
            agenda: meetingAgenda || "",
            groupName: group.groupName,
            status: "scheduled",
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to schedule meeting");
      }

      setMeetingTitle("");
      setMeetingDate("");
      setMeetingLocation("");
      setMeetingAgenda("");
      flash(
        setMeetingFeedback,
        "success",
        "Meeting scheduled and members notified.",
      );
    } catch (err) {
      flash(
        setMeetingFeedback,
        "error",
        err.message || "Failed to schedule meeting.",
      );
    } finally {
      setMeetingSaving(false);
    }
  };

  // ── Save announcement only ──
  const handleSaveAnnouncement = async () => {
    const e = {};
    if (!announcementTitle) e.announcementTitle = "This field is required.";
    if (!announcement.trim()) e.announcement = "This field is required.";
    setAnnErrors(e);
    if (Object.keys(e).length > 0) return;

    setAnnSaving(true);
    try {
      const res = await fetch(
        `https://stockvel-2kvp.onrender.com/api/groups/${group.id}/announcements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: announcementTitle,
            message: announcement,
            groupName: group.groupName,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send announcement");
      }

      setAnnouncementTitle("");
      setAnnouncement("");
      flash(setAnnFeedback, "success", "Announcement sent to all members.");
    } catch (err) {
      flash(
        setAnnFeedback,
        "error",
        err.message || "Failed to send announcement.",
      );
    } finally {
      setAnnSaving(false);
    }
  };

  return (
    <section className="body">
      <section className="page">
        {/* ── Header ── */}
        <section className="header">
          <button className="back-btn" onClick={onBack}>
            &#8592;
          </button>
          <span className="page-title">Configure group</span>
        </section>

        <p className="group-name">{group.groupName}</p>

        {/* ── Payout Rules ── */}
        <section className="card">
          <p className="card-title">Payout rules</p>

          <SelectField
            label="Payout order"
            id="payout-order"
            options={[
              "Select payout order…",
              "Admin-defined (manual order)",
              "Random",
              "First joined",
            ]}
            value={payoutOrder}
            onChange={setPayoutOrder}
          />

          <Field label="Late payment penalty (R)">
            <input
              type="number"
              placeholder="e.g. 50"
              value={latePenalty}
              onChange={(e) => {
                setLatePenalty(e.target.value);
                setPayoutErrors((p) => ({ ...p, latePenalty: "" }));
              }}
            />
            {payoutErrors.latePenalty && (
              <span className="error">{payoutErrors.latePenalty}</span>
            )}
          </Field>

          <Field label="Grace period (days)" isLast>
            <input
              type="number"
              placeholder="e.g. 3"
              value={gracePeriod}
              onChange={(e) => {
                setGracePeriod(e.target.value);
                setPayoutErrors((p) => ({ ...p, gracePeriod: "" }));
              }}
            />
            {payoutErrors.gracePeriod && (
              <span className="error">{payoutErrors.gracePeriod}</span>
            )}
          </Field>

          <CardFooter
            onSave={handleSavePayout}
            saving={payoutSaving}
            label="Save payout rules"
            feedback={payoutFeedback}
          />
        </section>

        {/* ── Meeting Schedule ── */}
        <section className="card">
          <p className="card-title">Schedule a meeting</p>

          <SelectField
            label="Meeting frequency"
            id="meeting-frequency"
            options={["Select frequency…", "Monthly", "Weekly", "Bi-weekly"]}
            value={meetingFreq}
            onChange={(val) => {
              setMeetingFreq(val);
              setMeetingErrors((p) => ({ ...p, meetingFreq: "" }));
            }}
          />
          {meetingErrors.meetingFreq && (
            <span className="error">{meetingErrors.meetingFreq}</span>
          )}

          <SelectField
            label="Day of meeting"
            id="day-of-meeting"
            options={[
              "Select day…",
              "First Saturday",
              "Last Saturday",
              "First Sunday",
              "Last Sunday",
            ]}
            value={meetingDay}
            onChange={(val) => {
              setMeetingDay(val);
              setMeetingErrors((p) => ({ ...p, meetingDay: "" }));
            }}
          />
          {meetingErrors.meetingDay && (
            <span className="error">{meetingErrors.meetingDay}</span>
          )}

          <Field label="Meeting title">
            <input
              type="text"
              placeholder="e.g. Monthly check-in"
              value={meetingTitle}
              onChange={(e) => {
                setMeetingTitle(e.target.value);
                setMeetingErrors((p) => ({ ...p, meetingTitle: "" }));
              }}
            />
            {meetingErrors.meetingTitle && (
              <span className="error">{meetingErrors.meetingTitle}</span>
            )}
          </Field>

          <Field label="Meeting date & time">
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => {
                setMeetingDate(e.target.value);
                setMeetingErrors((p) => ({ ...p, meetingDate: "" }));
              }}
            />
            {meetingErrors.meetingDate && (
              <span className="error">{meetingErrors.meetingDate}</span>
            )}
          </Field>

          <Field label="Location">
            <input
              type="text"
              placeholder="e.g. Community hall, Zoom link..."
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
            />
          </Field>

          <Field label="Agenda" isLast>
            <textarea
              placeholder="What will be discussed at this meeting?"
              value={meetingAgenda}
              onChange={(e) => setMeetingAgenda(e.target.value)}
            />
          </Field>

          <CardFooter
            onSave={handleSaveMeeting}
            saving={meetingSaving}
            label="Schedule meeting"
            feedback={meetingFeedback}
          />
        </section>

        {/* ── Broadcast Announcement ── */}
        <section className="card">
          <p className="card-title">Broadcast announcement</p>

          <Field label="Announcement title">
            <input
              type="text"
              placeholder="e.g. Payment reminder"
              value={announcementTitle}
              onChange={(e) => {
                setAnnouncementTitle(e.target.value);
                setAnnErrors((p) => ({ ...p, announcementTitle: "" }));
              }}
            />
            {annErrors.announcementTitle && (
              <span className="error">{annErrors.announcementTitle}</span>
            )}
          </Field>

          <Field label="Message to all members" isLast>
            <textarea
              placeholder="Type your announcement here…"
              value={announcement}
              onChange={(e) => {
                setAnnouncement(e.target.value);
                setAnnErrors((p) => ({ ...p, announcement: "" }));
              }}
            />
            {annErrors.announcement && (
              <span className="error">{annErrors.announcement}</span>
            )}
          </Field>

          <CardFooter
            onSave={handleSaveAnnouncement}
            saving={annSaving}
            label="Send announcement"
            feedback={annFeedback}
          />
        </section>
      </section>
    </section>
  );
}

// ── VIEW 1 — List of all active groups ──
function GroupList({ onSelect }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [userGroupIds, setUserGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          "https://stockvel-2kvp.onrender.com/api/groups",
        );
        if (!res.ok) throw new Error("Failed to fetch groups");
        const data = await res.json();

        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserGroupIds(userData.groups || []);
          }
        }

        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const userGroups = groups.filter((g) => {
    if (userGroupIds.includes(g.id)) return true;
    if (g.members && g.members.includes(user?.uid)) return true;
    return false;
  });

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem 0",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Loading groups…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fee2e2",
          color: "#dc2626",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          padding: "0.75rem 1rem",
          fontSize: "0.875rem",
        }}
      >
        Error loading groups: {error}
      </div>
    );
  }

  if (userGroups.length === 0) {
    return (
      <div
        style={{
          padding: "2rem 0",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        You are not a member of any groups yet.
      </div>
    );
  }

  return (
    <section className="active-groups-container">
      {userGroups.map((group) => (
        <section
          key={group.id}
          className="active-Member"
          onClick={() => onSelect(group)}
          style={{
            cursor: "pointer",
            transition: "box-shadow 0.18s, border-color 0.18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)";
            e.currentTarget.style.borderColor = "#bfdbfe";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "";
            e.currentTarget.style.borderColor = "";
          }}
        >
          <section className="active-Member-top">
            <h3 className="active-Member-name">{group.groupName}</h3>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span className="active-Member-badge">Active</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#1d4ed8",
                  background: "#eff6ff",
                  padding: "0.18rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid #dbeafe",
                }}
              >
                Configure →
              </span>
            </div>
          </section>

          <section className="active-Member-grid">
            <section className="active-Member-stat">
              <span className="stat-label">Contribution</span>
              <span className="stat-value">R {group.contributionAmount}</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Frequency</span>
              <span className="stat-value">
                {group.meetingFrequency || "—"}
              </span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Max members</span>
              <span className="stat-value">{group.maxMembers}</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{group.duration} months</span>
            </section>
            <section className="active-Member-stat">
              <span className="stat-label">Payout order</span>
              <span className="stat-value">{group.payoutOrder || "—"}</span>
            </section>
          </section>

          <p className="active-Member-date">
            Created{" "}
            {new Date(group.createdAt).toLocaleDateString("en-ZA", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </section>
      ))}
    </section>
  );
}

// ── ROOT EXPORT ──
export default function ConfigureGroupPage({ onBack, preselectedGroupId }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingPreselected, setLoadingPreselected] =
    useState(!!preselectedGroupId);
  const navigate = useNavigate();

  useEffect(() => {
    if (preselectedGroupId) {
      const fetchGroup = async () => {
        try {
          const res = await fetch(
            `https://stockvel-2kvp.onrender.com/api/groups/${preselectedGroupId}`,
          );
          if (res.ok) {
            const groupData = await res.json();
            setSelectedGroup(groupData);
          }
        } catch (err) {
          console.error("Failed to fetch preselected group:", err);
        } finally {
          setLoadingPreselected(false);
        }
      };
      fetchGroup();
    }
  }, [preselectedGroupId]);

  if (loadingPreselected) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-inner">
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (selectedGroup) {
    return (
      <ConfigureForm
        group={selectedGroup}
        onBack={() => {
          if (preselectedGroupId) {
            navigate("/browse-groups");
          } else {
            setSelectedGroup(null);
          }
        }}
      />
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">
        <div className="dashboard-header">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.4rem",
            }}
          >
            <button
              className="btn btn-outline"
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.82rem" }}
              onClick={() => navigate("/admin")}
            >
              ← Back
            </button>
            <h2 style={{ margin: 0 }}>Configure a group</h2>
          </div>
          <p>Click any group below to manage its settings.</p>
        </div>

        <GroupList onSelect={setSelectedGroup} />
      </div>
    </div>
  );
}
