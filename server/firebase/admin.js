const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  throw new Error(
    "Missing Firebase service account environment variables. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL."
  );
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = db;
