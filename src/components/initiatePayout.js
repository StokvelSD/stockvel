import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";

const PAYSTACK_SECRET = "sk_test_adc15a664a72600a8e6f56b95cc04f43368d7c72";
const PAYSTACK_BASE = "https://api.paystack.co";

async function createTransferRecipient(bankDetails) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    return "RCP_twenzmvne0bg3b8";
  }

  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: bankDetails.accountName,
      account_number: bankDetails.accountNumber,
      bank_code: bankDetails.bankCode,
      currency: "ZAR",
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Failed to create transfer recipient");
  return data.data.recipient_code;
}

async function paystackTransfer({ recipientCode, amountZAR, payoutId }) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    return {
      reference: `TEST_REF_${Date.now()}`,
    };
  }

  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: amountZAR * 100,
      recipient: recipientCode,
      reason: `Stokvel payout - ${payoutId}`,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Paystack transfer failed");
  return { reference: data.data.reference };
}

export const initiatePayout = async ({ groupId, amount }) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid payout amount");
  }

  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (!groupDoc.exists()) throw new Error("Group not found");

  const groupData = groupDoc.data();
  const payoutOrder = groupData.payoutOrder || [];
  const currentCycle = groupData.currentCycle || 1;

  if (payoutOrder.length === 0) throw new Error("No payout order set for this group");

  const payoutsSnap = await getDocs(
    query(
      collection(db, "payouts"),
      where("groupId", "==", groupId)
    )
  );

  const paidMemberIds = payoutsSnap.docs
    .map(d => d.data())
    .filter(p => p.cycleId === currentCycle && p.status === "success")
    .map(p => p.userId);

  const nextMemberId = payoutOrder.find(uid => !paidMemberIds.includes(uid));
  if (!nextMemberId) throw new Error("All members have been paid out this cycle");

  const nextMemberDoc = await getDoc(doc(db, "users", nextMemberId));
  if (!nextMemberDoc.exists()) throw new Error("Next member user record not found");
  const nextMember = { id: nextMemberDoc.id, ...nextMemberDoc.data() };

  const payoutRef = await addDoc(collection(db, "payouts"), {
    groupId,
    userId: nextMember.id,
    userName: nextMember.name || nextMember.email,
    amount,
    cycleId: currentCycle,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  const bankSnap = await getDocs(
    query(
      collection(db, "Bank Details"),
      where("memberId", "==", nextMember.id)
    )
  );

  const bankDetails = bankSnap.empty
    ? { accountName: nextMember.name || nextMember.email, accountNumber: "0000000000", bankCode: "000" }
    : bankSnap.docs[0].data();

  let recipientCode;
  try {
    recipientCode = await createTransferRecipient(bankDetails);
  } catch (err) {
    await updateDoc(payoutRef, { status: "failed", reason: err.message });
    throw err;
  }

  let reference;
  try {
    const transferResult = await paystackTransfer({
      recipientCode,
      amountZAR: amount,
      payoutId: payoutRef.id,
    });
    reference = transferResult.reference;
  } catch (err) {
    await updateDoc(payoutRef, { status: "failed", reason: err.message });
    throw new Error(`Payment failed: ${err.message}`);
  }

  await updateDoc(payoutRef, {
    status: "success",
    paidAt: serverTimestamp(),
    reference,
  });

  const newPaidCount = paidMemberIds.length + 1;
  const isLastMember = newPaidCount === payoutOrder.length;

  if (isLastMember) {
    await updateDoc(doc(db, "groups", groupId), {
      currentCycle: currentCycle + 1,
      cycleStartDate: serverTimestamp(),
    });
  }

  return { success: true, cycleAdvanced: isLastMember, newCycle: isLastMember ? currentCycle + 1 : currentCycle };
};