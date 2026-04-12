const db = require("../firebase/admin");

const createGroup = async (req, res) => {
  try {
    const {
      groupName,
      contributionAmount,
      description,
      maxMembers,
      meetingFrequency,
      duration,
      payoutOrder,
    } = req.body;

    // ✅ Fixed: was !groupName.trim() === '' which is always false
    if (!groupName || groupName.trim() === "") {
      return res.status(400).json({ error: "Group name is required" });
    }
    if (!contributionAmount || contributionAmount <= 0) {
      return res
        .status(400)
        .json({ error: "Contribution amount must be greater than 0" });
    }

    await db.collection("groups").add({
      groupName: groupName.trim(),
      contributionAmount: Number(contributionAmount),
      description,
      maxMembers: Number(maxMembers),
      meetingFrequency,
      duration: Number(duration),
      payoutOrder,
      members: [],
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Group created successfully" });
  } catch (error) {
    console.error("createGroup error:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
};

const getGroups = async (req, res) => {
  try {
    const groupsSnapshot = await db.collection("groups").get();
    const groups = groupsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // ✅ Fixed: safely handle missing or malformed createdAt
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    });
    res.status(200).json(groups);
  } catch (error) {
    console.error("getGroups error:", error);
    res.status(500).json({ message: "Failed to fetch groups" });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }
    
    const groupDoc = await db.collection("groups").doc(groupId).get();

    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Group not found" });
    }

    const data = groupDoc.data();
    const group = {
      id: groupDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };

    res.status(200).json(group);
  } catch (error) {
    console.error("getGroupById error:", error.message);
    res.status(500).json({ error: "Failed to fetch group" });
  }
};

const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // We check if group exists
    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Group not found" });
    }

    const groupData = groupDoc.data();

    // We check if user is already a member
    if (groupData.members && groupData.members.includes(userId)) {
      return res.status(400).json({ error: "You are already a member of this group" });
    }

    // We check if group is full
    const currentMembers = groupData.members ? groupData.members.length : 0;
    if (currentMembers >= groupData.maxMembers) {
      return res.status(400).json({ error: "Group is full" });
    }

    // Add user directly to group members (no approval needed/we will decide this with group members later)
    await groupRef.update({
      members: [...(groupData.members || []), userId]
    });

    res.status(201).json({ message: "Successfully joined the group!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to join group" });
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
};
