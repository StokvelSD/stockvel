import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import "firebase/storage";

import { getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAHOrb5-hERdCpecMhvvHyqcNp_pJ69Txo",
  authDomain: "stokvel-b920c.firebaseapp.com",
  databaseURL: "https://stokvel-b920c-default-rtdb.firebaseio.com",
  projectId: "stokvel-b920c",
  storageBucket: "stokvel-b920c.firebasestorage.app",
  messagingSenderId: "558371026157",
  appId: "1:558371026157:web:ce75a7437e0304150408e4",
  measurementId: "G-Y49WEE4GYQ"
};


const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();
export const auth = getAuth(app);


export const db = getFirestore(app);
export const storage = getStorage(app);