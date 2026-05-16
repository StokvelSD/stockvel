const db = require("../firebase/admin");

async function getPaidContributions(req, res) {
  try {
    const { groupId } = req.query;
    const userId = req.user.uid;
    
    const contributionsRef = db.collection("contributions");
    const q = contributionsRef
      .where("groupId", "==", groupId)
      .where("userId", "==", userId)
      .where("status", "==", "paid");
    
    const snapshot = await q.get();
    const contributions = [];
    snapshot.forEach(doc => {
      contributions.push({ id: doc.id, ...doc.data() });
    });
    
    res.json(contributions);
  } catch (error) {
    console.error("Error fetching paid contributions:", error);
    res.status(500).json({ error: "Failed to fetch contributions" });
  }
}

async function getUserContributions(req, res){
    try{
        const userId = req.user.uid;

        const contributionsRef = db.collection("contributions");
        const q = contributionsRef.where("userId", "==", userId);
        const snapshot = await q.get();

        const contributions = [];
        snapshot.forEach(doc => {
            contributions.push({id: doc.id, ...doc.data()});

        });
        res.json(contributions);
    }catch(error){
        console.error("Error fetching user contributions:", error);
        res.status(500).json({error: "Failed to fetch contributions"});

    }
}

async function getUserContributionsByGroup(req, res){
    try{
        const userId = req.user.uid;

        const contributionsRef = db.collection("contributions");
        const q = contributionsRef.where("userId", "==", userId);
        const snapshot = await q.get();

        const groupMap = new Map();


        snapshot.forEach(doc => {
            const data = doc.data();
            const groupId = data.groupId;
            const groupName = data.groupName || "Unknown";
            const amount = data.amount || 0;


            if(groupMap.has(groupId)){
                groupMap.set(groupId, {
                    groupId,
                    groupName,
                    totalPaid: groupMap.get(groupId).totalPaid + amount
                });
            }else{
                groupMap.set(groupId, {groupId, groupName, totalPaid: amount});
            }
        });
        res.json(Array.from(groupMap.values()));
    }catch(error){
        console.error("Error", error);
        res.status(500).json({error: "Failed to fetch grouped contributions"});
    }
}

module.exports = {
    getUserContributions,
    getPaidContributions,
    getUserContributionsByGroup
}