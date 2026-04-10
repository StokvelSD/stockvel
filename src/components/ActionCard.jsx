// ─── src/components/ActionCard.jsx ──────────────────────────
import { useNavigate } from 'react-router-dom';
import '../index.css';

function ActionCard({ icon, label, route, colorClass = 'blue' }) {
  const navigate = useNavigate();
  return (
    <div className="action-card" onClick={() => route && navigate(route)}>
      <div className={`action-icon ${colorClass}`}>{icon}</div>
      <p>{label}</p>
    </div>
  );
}

export default ActionCard;