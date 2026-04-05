import { useNavigate } from "react-router-dom"; // makes my actioncard clickable

function ActionCard({ icon, label, route }) {
  const navigate = useNavigate();
  return (
    <article className="action" onClick={() => navigate(route)}>
      <span className="icon">{icon}</span>
      <p>{label}</p>
    </article>
  );
}

export default ActionCard;
