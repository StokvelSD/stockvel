// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { signInWithPopup , GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAHOrb5-hERdCpecMhvvHyqcNp_pJ69Txo",
  authDomain: "stokvel-b920c.firebaseapp.com",
  projectId: "stokvel-b920c",
  storageBucket: "stokvel-b920c.firebasestorage.app",
  messagingSenderId: "558371026157",
  appId: "1:558371026157:web:ce75a7437e0304150408e4",
  measurementId: "G-Y49WEE4GYQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);    
export const auth = getAuth(app);
export const functions = getFunctions(app);
export default app;