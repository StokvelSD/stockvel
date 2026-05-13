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

export const fetchAllUserContributions = async () => {
  const user = auth.currentUser;
  if(!user) throw new Error("Not authenticated");
  
  const token = await user.getIdToken();

  const res = await fetch(
    `http://localhost:5000/contributions/user/all`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    }
  );

  if(!res.ok) throw new Error("Failed to fetch user contributions");

  return await res.json();
};


export const fetchTotalPaid = async () => {
  const contributions = await fetchAllUserContributions();

  const total = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const count = contributions.length;
  return {total, count, contributions};
};


export const fetchContributionsByGroup = async () => {
  const contributions = await fetchAllUserContributions();

  const groupMap = new Map();

  contributions.forEach(contribution => {
    const groupId = contribution.groupId;
    const groupName = contribution.groupName || "Unknown Group";
    const amount = contribution.amount || 0;

    if(groupMap.has(groupId)){
      groupMap.set(groupId, {
        groupId,
        groupName,
        totalPaid: groupIdMap.get(groupId).totalPaid + amount,
        contributionCount: groupMap.get(groupId).contributionCount + 1
      });
    }else{
      groupMap.set(groupId, {
        groupId,
        groupName,
        totalPaid: amount,
        contributionCount: 1
      });
    }
  });
  return Array.from(groupMap.values());
};

export const fetchContributionsByDateRange = async (startDate, endDate) => {
  const contributions = await fetchAllUserContributions();

  const start = new Date(startDate);
  const end = new Date(endDate);

  const filtered = contributions.filter(contribution => {
    const contributionDate = new Date(contribution.date);
    return contributionDate >= start && contributionDate <= end;
  });

  const total = filtered.reduce((sum, c) => sum + (c.amount || 0), 0);

  return {contributions: filtered, total, count: filtered.length};
};


export const fetchComplianceRate = async (groupId, expectedMonthlyAmount) => {
  const contributions = await fetchPaidContributions(groupId);

  const joinDate = await getUserJoinDate(groupId);
  const monthsInGroup = calculateMonthsSince(joinDate);
  const expectedTotal = monthsInGroup * expectedMonthlyAmount;
   const actualTotal = contributions.reduce((sum, c) => sum + (c.amount || 0), 0);
  const complianceRate = (actualTotal / expectedTotal) * 100;


  return{
    expectedTotal,
    actualTotal,
    complianceRate: complianceRate.toFixed(1),
    missedPayments: monthsInGroup - contributions.length,
    onTrack: complianceRate >= 90
  };
};

const calculateMonthsSince = (date) => {
  const now = new Date();
  const start = new Date(date);
  let months = (now.getFullYear() - start.getFullYear()) * 12;
  months += now.getMonth() - start.getMonth();
  return Math.max(months, 1);
};

const getUserJoinDate = async (groupId) => {
  const user = auth.currentUser;
  const token = await user.getIdToken();
  
  const res = await fetch(
    `http://localhost:5000/groups/${groupId}/member-join-date`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if(!res.ok) return new Date();

  const data = await res.json();
  return data.joinDate;
};