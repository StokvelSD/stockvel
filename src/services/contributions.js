import { auth } from "../firebase/firebase";

const API_BASE_URL =  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const getToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return await user.getIdToken();
};

export const fetchAllUserPayments = async () => {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/contributions/user/all`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });

  if (!res.ok) throw new Error("Failed to fetch user payments");

  return await res.json();
};

export const fetchTotalPaid = async () => {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/contributions/user/total`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });

  if (!res.ok) throw new Error("Failed to fetch total paid contributions");

  return await res.json();
};

export const fetchContributionsByGroup = async () => {
  const token = await getToken();

  const res = await fetch(`${API_BASE_URL}/contributions/user/by-group`, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });

  if (!res.ok) throw new Error("Failed to fetch contributions by group");

  return await res.json();
};

export const fetchPaidContributions = async (groupId) => {
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/contributions/user/all`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch payments");
  const allPayments = await res.json();
  // Filter by groupId and status
  return allPayments.filter(p => p.groupId === groupId && p.status === "paid");
};

export const fetchAllContributions = async (groupId) => {
  const payments = await fetchAllUserPayments();
  return payments.filter(p => p.groupId === groupId && p.status === "paid");
};







