import { useState } from "react";
import { useNavigate } from "react-router-dom";
//import "../.css";

function CreateGroupForm() {
  const navigate = useNavigate(); // back bar button

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [contribution, setContribution] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [payoutOrder, setPayoutOrder] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      groupName,
      description,
      maxMembers,
      contribution,
      frequency,
      duration,
      payoutOrder,
    };
    console.log("Form Submitted:", formData);
    alert("Stokvel group created!"); /// i will need to replace with the API submission
  };

  return (
    <main>
      {" "}
      <section>
        <button className="back-btn" onClick={() => navigate("/")}>
          ←
        </button>
        <br />
      </section>
      <h2 className="topic">Create stokvel group</h2>
      <br></br>
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

            <label htmlFor="payout-order">Payout Order</label>
            <select
              id="payout-order"
              value={payoutOrder}
              onChange={(e) => setPayoutOrder(e.target.value)}
              required
            >
              <option value="">Admin-defined (manual order)</option>
            </select>
          </section>

          <button type="submit" className="submit-btn">
            Create Group
          </button>
        </form>
      </section>
    </main>
  );
}

export default CreateGroupForm;
