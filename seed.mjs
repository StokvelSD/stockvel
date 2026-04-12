import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAHOrb5-hERdCpecMhvvHyqcNp_pJ69Txo",
  authDomain: "stokvel-b920c.firebaseapp.com",
  projectId: "stokvel-b920c",
  storageBucket: "stokvel-b920c.firebasestorage.app",
  messagingSenderId: "558371026157",
  appId: "1:558371026157:web:ce75a7437e0304150408e4",
  measurementId: "G-Y49WEE4GYQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const users = [
  { groupId: "group_001", member: "Thabo Nkosi",     userId: "uid_001", amount: 500, status: "pending",   paymentMethod: "eft",  date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Nomsa Dlamini",   userId: "uid_002", amount: 500, status: "completed", paymentMethod: "cash", date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Sipho Mokoena",   userId: "uid_003", amount: 500, status: "pending",   paymentMethod: "eft",  date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Lerato Sithole",  userId: "uid_004", amount: 500, status: "completed", paymentMethod: "eft",  date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Kagiso Molefe",   userId: "uid_005", amount: 500, status: "pending",   paymentMethod: "cash", date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Zanele Khumalo",  userId: "uid_006", amount: 500, status: "completed", paymentMethod: "eft",  date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Bongani Zulu",    userId: "uid_007", amount: 500, status: "pending",   paymentMethod: "cash", date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Anika van Wyk",   userId: "uid_008", amount: 500, status: "completed", paymentMethod: "eft",  date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Mandla Dube",     userId: "uid_009", amount: 500, status: "pending",   paymentMethod: "cash", date: "2026-04-01", currency: "ZAR", type: "monthly" },
  { groupId: "group_001", member: "Precious Mahlangu", userId: "uid_010", amount: 500, status: "completed", paymentMethod: "eft", date: "2026-04-01", currency: "ZAR", type: "monthly" },

];

for (const user of users) {
  await addDoc(collection(db, "Contributions"), user);
  console.log("Added:", user.member);
}

console.log("Done!");