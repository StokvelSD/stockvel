// server/firebase/admin.js
const admin = require("firebase-admin");

let db = null;

// Function to initialize Firebase
function initializeFirebase() {
  if (admin.apps.length) return;
  
  let serviceAccount;
  
  // Try to use local JSON file first (most reliable)
  try {
    serviceAccount = require("./serviceAccountKey.json");
    console.log("✅ Using service account JSON file");
  } catch (e) {
    console.log("⚠️ No service account file, using environment variables");
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, '');
    }
    
    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
  }
  
  // Validate credentials
  if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
    console.error("❌ Missing Firebase credentials");
    return false;
  }
  
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized for:", serviceAccount.projectId);
    return true;
  } catch (error) {
    console.error("❌ Firebase init failed:", error.message);
    return false;
  }
}

// Initialize
const initialized = initializeFirebase();

if (initialized) {
  db = admin.firestore();
  console.log("✅ Firestore instance created");
}

const getFirestore = () => db;

module.exports = { admin, db, getFirestore };