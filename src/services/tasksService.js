// src/services/tasksService.js
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function fetchTasks() {
  const querySnapshot = await getDocs(collection(db, "tasks"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}