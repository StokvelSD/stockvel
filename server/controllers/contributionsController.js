// server/controllers/contributionsController.js
const { getFirestore } = require("../firebase/admin");

async function getUserContributions(req, res) {
  try {
    const userId = req.user.uid;
    console.log("🔍 getUserContributions - userId:", userId);

    const db = getFirestore();
    if (!db) {
      console.error("❌ db is undefined!");
      return res.status(500).json({ error: "Database not initialized" });
    }

    const paymentsRef = db.collection("payments");
    const q = paymentsRef.where("userId", "==", userId);
    const snapshot = await q.get();

    const payments = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        amount: data.amount || 0,
        groupId: data.groupId,
        groupName: data.groupName || "Unknown",
        status: data.status || "paid",
        reference: data.reference,
        userName: data.userName,
        date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      });
    });

    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(payments);
  } catch (error) {
    console.error("❌ Error fetching user contributions:", error.message);
    res.status(500).json({ error: "Failed to fetch contributions", details: error.message });
  }
}

async function getTotPaid(req, res) {
  try {
    const userId = req.user.uid;
    console.log("🔍 getTotPaid - userId:", userId);

    const db = getFirestore();
    if (!db) {
      console.error("❌ db is undefined!");
      return res.status(500).json({ error: "Database not initialized" });
    }

    const paymentsRef = db.collection("payments");
    const q = paymentsRef.where("userId", "==", userId).where("status", "==", "paid");
    const snapshot = await q.get();

    let totalPaid = 0;
    const payments = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const amount = data.amount || 0;
      totalPaid += amount;
      payments.push({
        id: doc.id,
        amount: amount,
        groupId: data.groupId,
        groupName: data.groupName || "Unknown",
        status: data.status || "paid",
        reference: data.reference,
        date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      });
    });

    console.log(`✅ Total paid: R${totalPaid} from ${payments.length} payments`);
    res.json({
      total: totalPaid,
      count: payments.length,
      contributions: payments
    });
  } catch (error) {
    console.error("❌ Error in getTotPaid:", error.message);
    res.status(500).json({ error: "Failed to calculate total paid", details: error.message });
  }
}

async function getContributionsByGroup(req, res) {
  try {
    const userId = req.user.uid;
    console.log("🔍 getContributionsByGroup - userId:", userId);

    const db = getFirestore();
    if (!db) {
      console.error("❌ db is undefined!");
      return res.status(500).json({ error: "Database not initialized" });
    }

    const paymentsRef = db.collection("payments");
    const q = paymentsRef.where("userId", "==", userId).where("status", "==", "paid");
    const snapshot = await q.get();

    const groupMap = new Map();

    snapshot.forEach(doc => {
      const data = doc.data();
      const groupId = data.groupId;
      const groupName = data.groupName || "Unknown";
      const amount = data.amount || 0;

      if (groupMap.has(groupId)) {
        groupMap.set(groupId, {
          groupId,
          groupName,
          totalPaid: groupMap.get(groupId).totalPaid + amount,
          contributionCount: groupMap.get(groupId).contributionCount + 1
        });
      } else {
        groupMap.set(groupId, {
          groupId,
          groupName,
          totalPaid: amount,
          contributionCount: 1
        });
      }
    });

    console.log(`✅ Group breakdown: ${groupMap.size} groups found`);
    res.json(Array.from(groupMap.values()));
  } catch (error) {
    console.error("❌ Error fetching grouped contributions:", error.message);
    res.status(500).json({ error: "Failed to fetch grouped contributions", details: error.message });
  }
}

module.exports = {
  getTotPaid,
  getUserContributions,
  getContributionsByGroup
};