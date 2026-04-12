import { collection, query, where, getDocs } from "firebase/firestore";
import { auth } from "../firebase/firebase";
import { db } from "../firebase/firebase";

export const fetchPaidContributions = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User not logged in");
  }

  // adjust this field to match your Firestore schema
  const member = user.email;

  const contributionsRef = collection(db, "contributions");

  const q = query(
    contributionsRef,
    where("member", "==", member), // hardcoded for testing, replace with dynamic member variable
    where("status", "==", "paid")
  );

  const querySnapshot = await getDocs(q);

  const results = querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      amount: data.amount,
      date: data.date,
      status: data.status
    };
  });

  return results;
};