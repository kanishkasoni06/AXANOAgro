import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import Razorpay from "razorpay";
import { config } from "dotenv";
import serviceAccount from "./service-account.json" assert { type: "json" };
import { sendNotification } from "./sendNotifcations.js";

config({ path: "./.env" });

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  ignoreUndefinedProperties: true, // Enable to ignore undefined values
});

const db = admin.firestore();
const app = express();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_xqIA5b66QZO5JV',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '60CDBRUXKEBhY38PmZ5m6bmA',
});

app.use(cors());
app.use(express.json());

app.post("/api/send-token", async (req, res) => {
  try {
    const { token, userId, userType } = req.body;
    if (!token || !userId || !userType) {
      return res.status(400).json({ error: "Missing token, userId, or userType" });
    }

    await db.collection("fcmTokens").add({
      token,
      userId,
      userType,
      timestamp: new Date(),
    });

    console.log(`Token stored for userId: ${userId}, userType: ${userType}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in /api/send-token:", error);
    res.status(500).json({ error: "Failed to store token: " + error.message });
  }
});

app.post("/api/send-notification", async (req, res) => {
  try {
    const { title, body, category, imageUrl, targetGroups } = req.body;
    if (!title || !body || !targetGroups || !Array.isArray(targetGroups)) {
      return res.status(400).json({ error: "Missing or invalid title, body, or targetGroups" });
    }

    await sendNotification(title, body, category, imageUrl, targetGroups);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in /api/send-notification:", error);
    res.status(500).json({ error: "Failed to send notification: " + error.message });
  }
});

app.post('/create-order', async (req, res) => {
  try {
    const amount = req.body.amount || 100;
    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order: ' + error.message });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));