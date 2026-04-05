// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAHOrb5-hERdCpecMhvvHyqcNp_pJ69Txo",
  authDomain: "stokvel-b920c.firebaseapp.com",
  projectId: "stokvel-b920c",
  storageBucket: "stokvel-b920c.firebasestorage.app",
  messagingSenderId: "558371026157",
  appId: "1:558371026157:web:ce75a7437e0304150408e4",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);