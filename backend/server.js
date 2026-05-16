const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   🔐 MIDDLEWARE
========================= */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/* =========================
   📊 ROUTES
========================= */

app.get("/contributions/paid", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { groupId } = req.query; // ✅ get groupId from frontend

    if (!groupId) {
      return res.status(400).json({ error: "groupId is required" });
    }

    const snapshot = await db
      .collection("payments")
      .where("groupId", "==", groupId)
      .where("userId", "==", userId)
      .where("status", "==", "paid")
      .get();

    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        ...d,
        date: d.createdAt?.toDate?.() || null
      };
    });

    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
