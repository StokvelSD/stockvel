const ThingCard = ({ item }) => {
  const formattedDate = item.date?.toDate
    ? item.date.toDate().toLocaleDateString()
    : item.date;

  return (
    <div className="card">
      <h3>Amount: R{item.amount}</h3>
      <p>Date: {formattedDate}</p>
      <p>Status: {item.status}</p>
    </div>
  );
};

export default ThingCard;