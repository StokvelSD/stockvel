import { useEffect, useState } from "react";
import { fetchPaidContributions } from "./Thingsdata";
import ThingCard from "./ThingCard";

const ThingsList = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContributions = async () => {
      try {
        const data = await fetchPaidContributions();
        setItems(data);
      } catch (error) {
        console.error("Failed to fetch contributions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadContributions();
  }, []);

  if (loading) return <p>Loading contributions...</p>;

  return (
    <div className="grid">
      {items.map((item) => (
        <ThingCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default ThingsList;