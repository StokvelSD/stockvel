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
const PAYSTACK_BASE   = "https://api.paystack.co";

async function resolveAccount(accountNumber, bankCode) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    return {
      account_number: accountNumber,
      account_name: "Test Account",
    };
  }

  const res = await fetch(
    `${PAYSTACK_BASE}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
  );

  const data = await res.json();
  if (!data.status) throw new Error(`Account resolution failed: ${data.message}`);
  return data.data;
}

async function createTransferRecipient(bankDetails) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    return "RCP_test_mock";
  }

  const resolved = await resolveAccount(bankDetails.accountNumber, bankDetails.bankCode);

  const res = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: resolved.account_name,
      account_number: resolved.account_number,
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
      newBalance: 0,
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

  return { reference: data.data.reference, newBalance: 0 };
}

export const initiatePayout = async ({ groupId, amount, currentCycleId = 1 }) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid payout amount");
  }

  const groupDoc = await getDoc(doc(db, "groups", groupId));
  if (!groupDoc.exists()) throw new Error("Group not found");
  
  const groupData = groupDoc.data();
  const memberIds = groupData.members || [];
  if (memberIds.length === 0) throw new Error("No members in this group");

  const userDocs = await Promise.all(memberIds.map(id => getDoc(doc(db, "users", id))));
  const users = userDocs
    .filter(d => d.exists())
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "")); 

  // FIXED: Single query to prevent Firebase Missing Index errors
  const payoutsSnap = await getDocs(
    query(
      collection(db, "payouts"),
      where("groupId", "==", groupId)
    )
  );

  // FIXED: Filter the cycle and success status in memory
  const paidMemberIds = payoutsSnap.docs
    .map(d => d.data())
    .filter(p => p.cycleId === currentCycleId && p.status === "success")
    .map(p => p.userId);

  const nextMember = users.find(m => !paidMemberIds.includes(m.id));
  if (!nextMember) throw new Error("All members already paid this cycle");

  const payoutRef = await addDoc(collection(db, "payouts"), {
    groupId,
    userId: nextMember.id,
    userName: nextMember.name || nextMember.email,
    amount,
    cycleId: currentCycleId,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  const bankSnap = await getDocs(
    query(
      collection(db, "Bank Details"),
      where("memberId", "==", nextMember.id)
    )
  );

  let bankDetails;
  
  if (bankSnap.empty) {
    bankDetails = {
      accountName: nextMember.name || nextMember.email,
      accountNumber: "0000000000",
      bankCode: "000"
    };
  } else {
    bankDetails = bankSnap.docs[0].data();
  }

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

  return true;
};