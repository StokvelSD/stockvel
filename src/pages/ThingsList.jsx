import { useEffect, useState } from "react";
import { fetchPaidContributions } from "../services/contributions";

const ThingsList = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchPaidContributions();
        setContributions(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);
    
console.log("raw date:", contributions[0]?.date);
  if (loading) return <p>Loading contributions...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      {contributions.length === 0 ? (
        <p>No contributions found</p>
      ) : (
contributions.map((c) => (
  <div key={c.id} style={{ padding: "10px", borderBottom: "1px solid #ddd" }}>
    <p><strong>Amount:</strong> {c.amount}</p>
    <p><strong>Status:</strong> {c.status}</p>

<p>
<strong>Date:</strong>{" "}
{c.date &&
  `${new Date(c.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })} at ${new Date(c.date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })}`}
</p>
  </div>
))
      )}
    </div>
  );
};

export default ThingsList;