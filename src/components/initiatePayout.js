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
import { db } from "../firebase/firebase";

// ⚠️  Keep this in an .env file: VITE_PAYSTACK_SECRET_KEY=sk_live_...
// Only acceptable for internal/admin tools — never ship this in a public app.
const PAYSTACK_SECRET = "sk_test_adc15a664a72600a8e6f56b95cc04f43368d7c72";
const PAYSTACK_BASE   = "https://api.paystack.co";

// ---------------------------------------------------------------------------
// Thin Paystack client (no SDK needed)
// ---------------------------------------------------------------------------


async function resolveAccount(accountNumber, bankCode) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    // Paystack test mode doesn't support account resolution
    // Return a mock resolved account
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
/**
 * Resolve a bank account to a Paystack transfer recipient code.
 * We create a new recipient each time; in production you'd cache this.
 */
// 2. Create recipient (calls resolveAccount first)

const res = await fetch("https://api.paystack.co/bank?currency=NGN&type=nuban", {
  headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
});
const { data } = await res.json();
console.log(JSON.stringify(data.map(b => ({ name: b.name, code: b.code }))));


async function createTransferRecipient(bankDetails) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    console.log("Test mode: skipping recipient creation, using mock recipient code");
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
      currency: "NGN",
    }),
  });

  const data = await res.json();
  console.log("createTransferRecipient response:", JSON.stringify(data));
  if (!data.status) throw new Error(data.message || "Failed to create transfer recipient");
  return data.data.recipient_code;
}

/**
 * Initiate a Paystack transfer and return { reference, newBalance }.
 * Amount must be in kobo (multiply naira × 100).
 */
async function paystackTransfer({ recipientCode, amountNaira, payoutId }) {
  if (PAYSTACK_SECRET.startsWith("sk_test_")) {
    console.log("Test mode: skipping real transfer");
    return {
      reference: `TEST_REF_${Date.now()}`,
      newBalance: 0,
    };
  }

  // real transfer code below...
  const res = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: amountNaira * 100,
      recipient: recipientCode,
      reason: `Stokvel payout – ${payoutId}`,
    }),
  });

  const data = await res.json();
  if (!data.status) throw new Error(data.message || "Paystack transfer failed");

  const balRes = await fetch(`${PAYSTACK_BASE}/balance`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const balData = await balRes.json();
  const newBalanceNaira = balData.data[0].balance / 100;

  return { reference: data.data.reference, newBalance: newBalanceNaira };
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export const initiatePayout = async ({ amount, currentCycleId }) => {
  if (!amount || amount <= 0) {
    throw new Error("Invalid payout amount");
  }

  // 1️⃣ Fetch members alphabetically
  const membersSnap = await getDocs(
    query(collection(db, "contributions"), orderBy("member", "asc"))
  );

  const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  console.log("Next member to pay:", nextMember?.member ?? "None");
  if (!nextMember) throw new Error("All members already paid this cycle");

  // 4️⃣ Create pending payout record
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
    await updateDoc(payoutRef, { status: "failed", reason: "Missing bank details" });
    throw new Error("Member has no bank details");
  }

  const bankDetails = bankSnap.docs[0].data();

  // 6️⃣ Resolve bank account → Paystack recipient code
  let recipientCode;
  try {
    recipientCode = await createTransferRecipient(bankDetails);
  } catch (err) {
    await updateDoc(payoutRef, { status: "failed", reason: err.message });
    throw err;
  }

  // 7️⃣ Execute transfer via Paystack
  let reference, newBalance;
  try {
    ({ reference, newBalance } = await paystackTransfer({
      recipientCode,
      amountNaira: amount,
      payoutId: payoutRef.id,
    }));
  } catch (err) {
    await updateDoc(payoutRef, { status: "failed", reason: err.message });
    throw new Error(`Payment failed: ${err.message}`);
  }

  // 8️⃣ Mark payout as successful
  await updateDoc(payoutRef, {
    status: "success",
    paidAt: serverTimestamp(),
    reference,
  });

  // 9️⃣ Update treasury balance
  //await updateDoc(doc(db, "treasury", "main"), { balance: newBalance });

  // 🔟 Advance cycle if all members have now been paid
  // if (payoutsSnap.size + 1 === members.length) {
  //   await updateDoc(doc(db, "meta", "cycle"), {
  //     currentCycleId: currentCycleId + 1,
  //   });
  // }

  return true;
};