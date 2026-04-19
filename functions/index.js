const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

exports.payMember = functions.https.onCall(async (data) => {
  const { amount, bankDetails } = data;

  try {
    
    const response = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount: amount * 100,
        recipient: bankDetails.recipientCode,
        reason: "Monthly payout",
      },
      
      {
        
        headers: {
          Authorization: `Bearer ${functions.config().paystack.secret}`,
        },
      }
    );

    return {
      success: true,
      reference: response.data.data.reference,
      newBalance: admin.firestore.FieldValue.increment(-amount),
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.message || "Paystack error",
    };
  }
});