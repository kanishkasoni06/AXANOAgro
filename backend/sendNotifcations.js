import admin from "firebase-admin";

export const sendNotification = async (title, body, category, imageUrl, targetGroups) => {
  try {
    const tokens = new Set();

    const categoryIcons = {
      Informative: "/images/icons/info.png",
      "New Offer": "/images/icons/offer.png",
      Ideas: "/images/icons/idea.png",
      "AI Advice": "/images/icons/ai.png",
    };

    const processUsers = async (collectionName, userType) => {
      const snapshot = await admin.firestore().collection(collectionName).get();
      for (const doc of snapshot.docs) {
        const uid = doc.data().uid;
        if (!uid || typeof uid !== "string" || uid.trim() === "") {
          console.warn(`Skipping ${collectionName} document ${doc.id}: invalid uid`, {
            uid: doc.data(),
          });
          continue;
        }
        const tokensSnapshot = await admin.firestore()
          .collection("fcmTokens")
          .where("userId", "==", uid)
          .where("userType", "==", userType)
          .get();
        tokensSnapshot.forEach(tokenDoc => tokens.add(token));
      }
    };

    if (targetGroups.includes("All Users") || targetGroups.includes("Farmers")) {
      await processUsers("farmer", "Farmers");
    }

    if (targetGroups.includes("All Users") || targetGroups.includes("Buyers")) {
      await processUsers("buyer", "Buyers");
    }

    if (targetGroups.includes("All Users") || targetGroups.includes("Delivery Partners")) {
      await processUsers("deliveryPartner", "Delivery Partners");
    }

    if (tokens.size === 0) {
      console.log(`No tokens found for target groups: ${targetGroups.join(", ")}`);
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
        image: imageUrl || undefined,
      },
      data: {
        category: category || "Informative",
        imageUrl: imageUrl || "",
        icon: categoryIcons[category] || "/images/icons/info.png",
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      tokens: Array.from(tokens),
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent message to ${response.successCount} to ${ devices}`);

    if (response.failureCount > 0) {
      console.error(`Failed to send to ${response.failureCount} devices`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Token ${Array.from(tokens)[idx]} failed: ${resp.error?.message}`);
        }
      });
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};