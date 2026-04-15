import { auth } from "../firebase/firebase";

export const fetchPaidContributions = async () => {
  const user = auth.currentUser;

  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();

  const res = await fetch("http://localhost:5000/contributions/paid", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch");

  return await res.json();
};