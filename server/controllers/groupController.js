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

    // Validate user exists in the system
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const groupRef = db.collection("groups").doc(groupId);

    // Use transaction to prevent race conditions and ensure atomicity
    await db.runTransaction(async (transaction) => {
      const groupDoc = await transaction.get(groupRef);

      if (!groupDoc.exists) {
        throw new Error("Group not found");
      }

      const groupData = groupDoc.data();

      // Check if user is already a member
      if (groupData.members && groupData.members.includes(userId)) {
        throw new Error("You are already a member of this group");
      }

      // Check if group is full
      const currentMembers = groupData.members ? groupData.members.length : 0;
      if (currentMembers >= groupData.maxMembers) {
        throw new Error("Group is full");
      }

      // Add user directly to group members using arrayUnion (atomic, prevents duplicates)
      transaction.update(groupRef, {
        members: require("firebase-admin").firestore.FieldValue.arrayUnion(userId)
      });
    });

    res.status(201).json({ message: "Successfully joined the group!" });
  } catch (error) {
    console.error("joinGroup error:", error.message);

    // Handle specific errors
    if (error.message.includes("already a member")) {
      return res.status(400).json({ error: "You are already a member of this group" });
    }
    if (error.message.includes("Group is full")) {
      return res.status(400).json({ error: "Group is full" });
    }
    if (error.message.includes("Group not found")) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(500).json({ error: "Failed to join group" });
  }
};

const scheduleMeeting = async (req, res) => {
  try {
    const { groupId } = req.params;
    const {title, date, location, agenda } = req.body;
    const adminId = req.user.id; 

    if (!title || !date || !location || !agenda) {
      return res.status(400).json({ error: "All meeting details are required" });
    }

    const groupRef = db.collection("groups").doc(groupId);
    const groupDoc = await groupRef.get();  
    if (!groupDoc.exists) {
      return res.status(404).json({ error: "Group not found" });
    }

    const meeting = {
      groupId,
      title,
      date: new Date(date),
      agenda: agenda || "",
      minutes: "",
      status: "scheduled",
      createdBy: adminId,
      createdAt: new Date(),
    };

    const docRef = await db.collection("meetings").add(meeting);
    res.status(201).json({ message: "Meeting scheduled successfully", meetingId: docRef.id });
  } catch (error) {
    console.error("scheduleMeeting error:", error);
    res.status(500).json({ error: "Failed to schedule meeting" });
  }
};


const getGroupAnnouncements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const{limit = 20, offset = 0} = req.query;

    const snapshot = await db.collection("announcements")
      .where("groupId", "==", groupId)
      .orderBy("createdAt", "desc")
      .limit(Number(limit))
      .get();
    const announcements = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    });
    res.status(200).json(announcements);
  } catch (error) {
    console.error("getGroupAnnouncements error:", error);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
};
module.exports = {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  scheduleMeeting,
  getGroupAnnouncements
};
