import { useState, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// ── Reusable Field wrapper

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

// ── VIEW 2 — Configure form for a selected group ──

function ConfigureForm({ group, onBack }) {
  // Group config state
  const [payoutOrder, setPayoutOrder] = useState(group.payoutOrder || "");
  const [latePenalty, setLatePenalty] = useState(group.latePenalty || "");
  const [gracePeriod, setGracePeriod] = useState(group.gracePeriod || "");
  const [meetingFreq, setMeetingFreq] = useState(group.meetingFrequency || "");
  const [meetingDay, setMeetingDay] = useState(group.meetingDay || "");

  // Meeting schedule state
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingAgenda, setMeetingAgenda] = useState("");

  // Announcement state
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcement, setAnnouncement] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};

    // Payout rules — always required
    if (!latePenalty) e.latePenalty = "This field is required.";
    if (!gracePeriod) e.gracePeriod = "This field is required.";

    // Meeting fields — all required
    if (!meetingFreq) e.meetingFreq = "This field is required.";
    if (!meetingDay) e.meetingDay = "This field is required.";
    if (!meetingTitle) e.meetingTitle = "This field is required.";
    if (!meetingDate) e.meetingDate = "This field is required.";
    if (!meetingLocation) e.meetingLocation = "This field is required.";
    if (!meetingAgenda) e.meetingAgenda = "This field is required.";

    // Announcement fields — all required
    if (!announcementTitle) e.announcementTitle = "This field is required.";
    if (!announcement) e.announcement = "This field is required.";

    return e;
  };

  const handleSave = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      //  Save group config directly to Firestore (groups collection)
      await updateDoc(doc(db, "groups", group.id), {
        payoutOrder,
        latePenalty: Number(latePenalty),
        gracePeriod: Number(gracePeriod),
        meetingFrequency: meetingFreq,
        meetingDay,
      });

      //  Schedule meeting via backend API (saves to meetings collection)
      if (meetingTitle && meetingDate) {
        const meetingRes = await fetch(
          `https://stockvel-2kvp.onrender.com/api/groups/${group.id}/schedule-meeting`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: meetingTitle,
              date: new Date(meetingDate).toISOString(),
              location: meetingLocation || "",
              agenda: meetingAgenda || "",
              status: "scheduled",
            }),
          },
        );
        if (!meetingRes.ok) {
          const err = await meetingRes.json();
          console.log("Meeting error from backend:", err);
          throw new Error(err.error || "Failed to schedule meeting");
        }
      }

      // 3 — Send announcement via backend API (saves to announcements collection)
      if (announcementTitle && announcement.trim()) {
        const announcementRes = await fetch(
          `https://stockvel-2kvp.onrender.com/api/groups/${group.id}/announcements`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: announcementTitle,
              message: announcement,
            }),
          },
        );
        if (!announcementRes.ok) {
          const err = await announcementRes.json();
          throw new Error(err.error || "Failed to send announcement");
        }
      }

      // Reset meeting + announcement fields after successful save
      setMeetingTitle("");
      setMeetingDate("");
      setMeetingLocation("");
      setMeetingAgenda("");
      setAnnouncementTitle("");
      setAnnouncement("");

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
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

        {/* ── Success banner ── */}
        {saved && (
          <div
            style={{
              background: "#dcfce7",
              color: "#15803d",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "0.65rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "1rem",
            }}
          >
            ✓ Changes saved successfully!
          </div>
        )}

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
                setErrors((prev) => ({ ...prev, latePenalty: "" }));
              }}
            />
            {errors.latePenalty && (
              <span className="error">{errors.latePenalty}</span>
            )}
          </Field>

          <Field label="Grace period (days)" isLast>
            <input
              type="number"
              placeholder="e.g. 3"
              value={gracePeriod}
              onChange={(e) => {
                setGracePeriod(e.target.value);
                setErrors((prev) => ({ ...prev, gracePeriod: "" }));
              }}
            />
            {errors.gracePeriod && (
              <span className="error">{errors.gracePeriod}</span>
            )}
          </Field>
        </section>

        {/* ── Meeting Schedule ── */}
        <section className="card">
          <p className="card-title">Meeting schedule</p>
          <SelectField
            label="Meeting frequency"
            id="meeting-frequency"
            options={["Select frequency…", "Monthly", "Weekly", "Bi-weekly"]}
            value={meetingFreq}
            onChange={(val) => {
              setMeetingFreq(val);
              setErrors((prev) => ({ ...prev, meetingFreq: "" }));
            }}
          />
          {errors.meetingFreq && (
            <span className="error">{errors.meetingFreq}</span>
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
              setErrors((prev) => ({ ...prev, meetingDay: "" }));
            }}
          />
          {errors.meetingDay && (
            <span className="error">{errors.meetingDay}</span>
          )}
          <Field label="Meeting title">
            <input
              type="text"
              placeholder="e.g. Monthly check-in"
              value={meetingTitle}
              onChange={(e) => {
                setMeetingTitle(e.target.value);
                setErrors((prev) => ({ ...prev, meetingTitle: "" }));
              }}
            />
            {errors.meetingTitle && (
              <span className="error">{errors.meetingTitle}</span>
            )}
          </Field>

          <Field label="Meeting date & time">
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => {
                setMeetingDate(e.target.value);
                setErrors((prev) => ({ ...prev, meetingDate: "" }));
              }}
            />
            {errors.meetingDate && (
              <span className="error">{errors.meetingDate}</span>
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
                setErrors((prev) => ({ ...prev, announcementTitle: "" }));
              }}
            />
            {errors.announcementTitle && (
              <span className="error">{errors.announcementTitle}</span>
            )}
          </Field>

          <Field label="Message to all members" isLast>
            <textarea
              placeholder="Type your announcement here…"
              value={announcement}
              onChange={(e) => {
                setAnnouncement(e.target.value);
                setErrors((prev) => ({ ...prev, announcement: "" }));
              }}
            />
            {errors.announcement && (
              <span className="error">{errors.announcement}</span>
            )}
          </Field>
        </section>

        {/* ── Save button ── */}
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </section>
    </section>
  );
}

// ── VIEW 1 — List of all active groups ───

function GroupList({ onSelect }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [userGroupIds, setUserGroupIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all groups
        const res = await fetch(
          "https://stockvel-2kvp.onrender.com/api/groups",
        );
        if (!res.ok) throw new Error("Failed to fetch groups");
        const data = await res.json();
        
        // Fetch user's groups from their document
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
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

  // Filter groups to only show groups the user is a member of
  const userGroups = groups.filter(g => {
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

// ── ROOT EXPORT ──────────────

export default function ConfigureGroupPage({ onBack, preselectedGroupId }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loadingPreselected, setLoadingPreselected] = useState(!!preselectedGroupId);
  const navigate = useNavigate();

  // If preselectedGroupId is provided, fetch and select that group directly
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
          console.error('Failed to fetch preselected group:', err);
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
            navigate('/browse-groups');
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
