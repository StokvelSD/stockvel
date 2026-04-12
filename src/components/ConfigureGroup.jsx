import { useState } from "react";

function Field({ label, children, isLast }) {
  return (
    <section className={`field ${isLast ? "field-last" : ""}`}>
      <label>{label}</label>
      {children}
    </section>
  );
}

function SelectField({ label, id, options, isLast }) {
  return (
    <Field label={label} isLast={isLast}>
      <section className="select-wrap">
        <select id={id} defaultValue="" required>
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

export default function ConfigureGroup() {
  const [latePenalty, setLatePenalty] = useState("");
  const [gracePeriod, setGracePeriod] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [errors, setErrors] = useState({});

  const validate = (fields) => {
    const newErrors = {};
    if (!fields.latePenalty) newErrors.latePenalty = "This field is required.";
    if (!fields.gracePeriod) newErrors.gracePeriod = "This field is required.";
    if (!fields.announcement)
      newErrors.announcement = "This field is required.";
    return newErrors;
  };

  const handleSave = () => {
    const newErrors = validate({ latePenalty, gracePeriod, announcement });
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      alert("Changes saved!");
    }
  }; /// aPI's

  return (
    <section className="body">
      <section className="page">
        {/* Header */}
        <section className="header">
          <button className="back-btn">&#8592;</button>
          <span className="page-title">Configure group</span>
        </section>

        <p className="group-name">December Savings Club</p>

        {/* Payout Rules */}
        <section className="card">
          <p className="card-title">Payout rules</p>

          <SelectField
            label="Payout order"
            id="payout-order"
            options={["Admin-defined (manual order)", "Random", "First joined"]}
          />

          <Field label="Late payment penalty (R)">
            <input
              type="number"
              id="late-penalty"
              placeholder="e.g. 50"
              value={latePenalty}
              onChange={(e) => {
                setLatePenalty(e.target.value);
                setErrors((prev) => ({ ...prev, latePenalty: "" }));
              }}
              required
            />
            {errors.latePenalty && (
              <span className="error">{errors.latePenalty}</span>
            )}
          </Field>

          <Field label="Grace period (days)" isLast>
            <input
              type="number"
              id="grace-period"
              placeholder="e.g. 3"
              value={gracePeriod}
              onChange={(e) => {
                setGracePeriod(e.target.value);
                setErrors((prev) => ({ ...prev, gracePeriod: "" }));
              }}
              required
            />
            {errors.gracePeriod && (
              <span className="error">{errors.gracePeriod}</span>
            )}
          </Field>
        </section>

        {/* Meeting Schedule */}
        <section className="card">
          <p className="card-title">Meeting schedule</p>

          <SelectField
            label="Meeting frequency"
            id="meeting-frequency"
            options={["Select frequency...", "Monthly", "Weekly", "Bi-weekly"]}
          />

          <SelectField
            label="Day of meeting"
            id="day-of-meeting"
            options={[
              "Select day...",
              "First Saturday",
              "Last Saturday",
              "First Sunday",
              "Last Sunday",
            ]}
            isLast
          />
        </section>

        {/* Broadcast Announcement */}
        <section className="card">
          <p className="card-title">Broadcast announcement</p>

          <Field label="Message to all members" isLast>
            <textarea
              id="announcement"
              placeholder="Type your announcement here..."
              value={announcement}
              onChange={(e) => {
                setAnnouncement(e.target.value);
                setErrors((prev) => ({ ...prev, announcement: "" }));
              }}
              required
            />
            {errors.announcement && (
              <span className="error">{errors.announcement}</span>
            )}
          </Field>
        </section>

        {/* Save Button */}
        <button className="save-btn" onClick={handleSave}>
          Save changes
        </button>
      </section>
    </section>
  );
}
