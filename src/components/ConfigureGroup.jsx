import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";

//  Reusable Field wrapper

function Field({ label, children, isLast }) {
  return (
    <section className={`field ${isLast ? "field-last" : ""}`}>
      <label>{label}</label>
      {children}
    </section>
  );
}

//  Reusable Select wrapper

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

//  VIEW 2 — Configure form for a selected group

function ConfigureForm({ group, onBack }) {
  const [payoutOrder, setPayoutOrder] = useState(group.payoutOrder || "");
  const [latePenalty, setLatePenalty] = useState(group.latePenalty || "");
  const [gracePeriod, setGracePeriod] = useState(group.gracePeriod || "");
  const [meetingFreq, setMeetingFreq] = useState(group.meetingFrequency || "");
  const [meetingDay, setMeetingDay] = useState(group.meetingDay || "");
  const [announcement, setAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!latePenalty) e.latePenalty = "This field is required.";
    if (!gracePeriod) e.gracePeriod = "This field is required.";
    if (!announcement) e.announcement = "This field is required.";
    return e;
  };

  const handleSave = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        payoutOrder,
        latePenalty: Number(latePenalty),
        gracePeriod: Number(gracePeriod),
        meetingFrequency: meetingFreq,
        meetingDay,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes. Please try again.");
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
            onChange={setMeetingFreq}
          />

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
            onChange={setMeetingDay}
            isLast
          />
        </section>

        {/* ── Broadcast Announcement ── */}
        <section className="card">
          <p className="card-title">Broadcast announcement</p>

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

//  VIEW 1 — List of all active groups

function GroupList({ onSelect }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(
          "https://stockvel-2kvp.onrender.com/api/groups",
        );
        if (!res.ok) throw new Error("Failed to fetch groups");
        const data = await res.json();
        setGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

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

  if (groups.length === 0) {
    return (
      <div
        style={{
          padding: "2rem 0",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        No active groups found.
      </div>
    );
  }

  return (
    <section className="active-groups-container">
      {groups.map((group) => (
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
          {/* Top row: name + badges */}
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

          {/* Stats grid */}
          <section className="active-Member-grid">
            <section className="active-Member-stat">
              <span className="stat-label">Contribution</span>
              <span className="stat-value">R{group.contributionAmount}</span>
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

          {/* Created date */}
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

//  ROOT EXPORT — controls which view is shown

export default function ConfigureGroupPage({ onBack }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const navigate = useNavigate();

  // Group selected → show configure form
  if (selectedGroup) {
    return (
      <ConfigureForm
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)} // back = return to group list
      />
    );
  }

  // No group selected → show group list
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
