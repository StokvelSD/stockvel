// src/initiatePayout.js
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase/firebase";

export const initiatePayout = async ({ amount, currentCycleId }) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid payout amount");
  }

  // 1️⃣ Fetch members alphabetically
  const membersSnap = await getDocs(
    query(collection(db, "contributions"), orderBy("member", "asc"))
  );

  const members = membersSnap.docs.map(d => ({
    id: d.id,
    ...d.data(),
  }));

  if (!members.length) throw new Error("No members found");

  // 2️⃣ Fetch successful payouts in this cycle
  const payoutsSnap = await getDocs(
    query(
      collection(db, "payouts"),
      where("cycleId", "==", currentCycleId),
      where("status", "==", "success")
    )
  );

  const paidMemberIds = payoutsSnap.docs.map(d => d.data().memberId);

  // 3️⃣ Pick next unpaid member
  const nextMember = members.find(m => !paidMemberIds.includes(m.id));
  console.log("Next member to pay:", nextMember?.member || "None");
  if (!nextMember) {
    throw new Error("All members already paid this cycle");
  }

  // 4️⃣ Create pending payout
  const payoutRef = await addDoc(collection(db, "payouts"), {
    memberId: nextMember.id,
    amount,
    cycleId: currentCycleId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  // 5️⃣ Fetch bank details
  const bankSnap = await getDocs(
    query(
      collection(db, "Bank Details"),
      where("memberId", "==", nextMember.id)
    )
  );

  if (bankSnap.empty) {
    await updateDoc(payoutRef, {
      status: "failed",
      reason: "Missing bank details",
    });

    throw new Error("Member has no bank details");
  }

  const bankDetails = bankSnap.docs[0].data();

  // 6️⃣ Call backend Paystack function

  console.log("Calling paystack function with bank details:", bankDetails);
  const paystackFn = httpsCallable(functions, "payMember");
  
  const result = await paystackFn({
    payoutId: payoutRef.id,
    amount,
    bankDetails,
  });
  console.log("After calling paystack function");

  if (!result.data.success) {
    await updateDoc(payoutRef, {
      status: "failed",
      reason: result.data.message,
    });

    throw new Error("Payment failed");
  }

  // 7️⃣ Success updates
  await updateDoc(payoutRef, {
    status: "success",
    paidAt: serverTimestamp(),
    reference: result.data.reference,
  });

  // 8️⃣ Deduct funds
  await updateDoc(doc(db, "treasury", "main"), {
    balance: result.data.newBalance,
  });

  // 9️⃣ Cycle completion check (MONTHLY MODEL)
  if (payoutsSnap.size + 1 === members.length) {
    await updateDoc(doc(db, "meta", "cycle"), {
      currentCycleId: currentCycleId + 1,
    });
  }

  return true;
};