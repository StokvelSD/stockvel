import { useState } from "react";
import { useNavigate } from "react-router-dom";

function CreateGroupForm() {
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [contribution, setContribution] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [payoutOrder, setPayoutOrder] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("SUBMIT CLICKED 🔥");

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupName,
          description,
          maxMembers,
          contributionAmount: contribution,
          meetingFrequency: frequency,
          duration,
          payoutOrder,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect with success message
        navigate("/admin", {
          state: { message: "Stokvel group created successfully!" },
        });
      } else {
        setError(data.message || "Failed to create group");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <section>
        <button className="back-btn" onClick={() => navigate("/")}>
          ←
        </button>
      </section>

      <h2 className="topic">Create stokvel group</h2>

      <section className="container">
        <form className="stokvel-form" onSubmit={handleSubmit}>
          <section className="form-section">
            <label htmlFor="group-name">Group Name</label>
            <input
              type="text"
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. December Savings Club"
              required
            />

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the group"
              required
            />

            <label htmlFor="max-members">Max Number of Members</label>
            <input
              type="number"
              id="max-members"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="e.g. 12"
              required
            />

            <label htmlFor="contribution">Contribution Amount (R)</label>
            <input
              type="number"
              id="contribution"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="e.g. 500"
              required
            />

            <label htmlFor="frequency">Contribution Frequency</label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              required
            >
              <option value="">Select frequency</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>

            <label htmlFor="duration">Duration (months)</label>
            <input
              type="number"
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 12"
              required
            />

            {/*  FIXED DROPDOWN */}
            <label htmlFor="payout-order">Payout Order</label>
            <select
              id="payout-order"
              value={payoutOrder}
              onChange={(e) => setPayoutOrder(e.target.value)}
              required
            >
              <option value="">Select payout order</option>
              <option value="manual">Admin-defined (manual order)</option>
              <option value="random">Random</option>
              <option value="first">First joined</option>
            </select>

            {/* Error display */}
            {error && <p className="error">{error}</p>}
          </section>

          {/* Loading state */}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Group"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default CreateGroupForm;
