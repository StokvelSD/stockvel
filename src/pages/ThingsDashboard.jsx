import { useParams } from "react-router-dom";
import ThingsList from "./ThingsList";

const ThingsDashboard = () => {
  const { id: groupId } = useParams(); // ✅ get current group

  return (
    <section>
      <h2>Contributions Overview</h2>
      <ThingsList groupId={groupId} />
    </section>
  );
};

export default ThingsDashboard;