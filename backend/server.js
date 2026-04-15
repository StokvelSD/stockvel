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
   🔐 MIDDLEWARE (PUT HERE)
========================= */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // attach user to request
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

/* =========================
   📊 ROUTES (PUT BELOW)
========================= */

app.get("/contributions/paid", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db
      .collection("contributions")
      .where("userId", "==", userId)
      .where("status", "==", "paid")
      .get();

    const data = snapshot.docs.map(doc => {
      const d = doc.data();

      return {
        id: doc.id,
        ...d,
        date: d.date.toDate().toLocaleDateString()
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
