import ActionCard from "./ActionCard";

function Actions() {
  return (
    <section className="actions">
      <ActionCard icon="+" label="Create groups" route="/create-group" />
      <ActionCard icon="⚙️" label="Configure" />
      <ActionCard icon="👥" label="Members" />
      <ActionCard icon="💲" label="Payouts" />
    </section>
  );
}

export default Actions;
