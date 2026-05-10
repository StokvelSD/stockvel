import { auth } from "../firebase/firebase";

export const fetchPaidContributions = async (groupId) => {
  const user = auth.currentUser;

  if (!user) throw new Error("Not authenticated");
  if (!groupId) throw new Error("groupId is required");

  const token = await user.getIdToken();

  const res = await fetch(
    `http://localhost:5000/contributions/paid?groupId=${groupId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to fetch");

  return await res.json();
};