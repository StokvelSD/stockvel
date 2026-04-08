import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function AddContribution() {
  const amountRef = useRef();
  const dateRef = useRef();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddContribution = async () => {
    if (!auth.currentUser) {
      setError("You must be logged in");
      return;
    }

    const amount = amountRef.current.value;
    const date = dateRef.current.value;

    if (!amount || !date) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "contributions"), {
        amount: Number(amount),
        date,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Permission denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Add Contribution</h2>

      {error && <p className="error">{error}</p>}

      <input
        type="number"
        ref={amountRef}
        placeholder="Contribution Amount"
      />

      <input type="date" ref={dateRef} />

      <button onClick={handleAddContribution} disabled={loading}>
        {loading ? "Saving..." : "Add Contribution"}
      </button>
    </div>
  );
}