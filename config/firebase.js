const { initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const path = require("path");
const fs = require("fs");

let messaging = null;
let firebaseApp = null;

try {
  let serviceAccount = null;
  const envCreds = process.env.FIREBASE_CREDENTIALS;

  if (envCreds) {
    const trimmed = envCreds.trim();
    if (trimmed.startsWith("{")) {
      // Load raw JSON string from environment variable (Best for Railway)
      serviceAccount = JSON.parse(trimmed);
      console.log("🔥 [FCM] Loading Firebase credentials from environment variable");
    } else {
      // Treat as file path
      const keyPath = path.isAbsolute(trimmed) ? trimmed : path.join(__dirname, "..", trimmed);
      if (fs.existsSync(keyPath)) {
        serviceAccount = require(keyPath);
        console.log(`🔥 [FCM] Loading Firebase credentials from file path: ${keyPath}`);
      }
    }
  } else {
    // Default file fallback
    const defaultPath = path.join(__dirname, "firebase-service-account.json");
    if (fs.existsSync(defaultPath)) {
      serviceAccount = require(defaultPath);
      console.log("🔥 [FCM] Loading Firebase credentials from default config file");
    }
  }

  if (serviceAccount) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount)
    });
    messaging = getMessaging(firebaseApp);
    console.log("🔥 Firebase Admin SDK initialized successfully");
  } else {
    console.warn("⚠️  [FCM] Firebase credentials not found. Push notifications will be disabled.");
    console.warn("⚠️  [FCM] To enable, add FIREBASE_CREDENTIALS in Railway environment variables or place firebase-service-account.json in config/");
  }
} catch (error) {
  console.error("❌ Failed to initialize Firebase Admin SDK:", error.message);
}

/**
 * Send push notification to a list of device tokens
 * @param {string[]} tokens List of FCM tokens
 * @param {string} title Notification Title
 * @param {string} body Notification Body
 * @param {object} data Extra key-value pairs (must be string values)
 */
const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!messaging) {
    console.warn("⚠️  [FCM] Cannot send push notification: Firebase Messaging is not initialized");
    return { success: false, error: "Firebase not initialized" };
  }

  if (!tokens || tokens.length === 0) {
    return { success: true, message: "No tokens to send to" };
  }

  // Filter out empty or null tokens
  const activeTokens = tokens.filter(t => t && t.trim() !== "");
  if (activeTokens.length === 0) return { success: true };

  // Convert all data object properties to string (FCM requirement)
  const stringData = {};
  Object.keys(data).forEach(key => {
    stringData[key] = String(data[key]);
  });

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      ...stringData,
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    },
    tokens: activeTokens
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`✉️  [FCM] Sent notifications: ${response.successCount} succeeded, ${response.failureCount} failed.`);
    
    // Identify invalid/expired tokens to clean them up
    const tokensToRemove = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errCode = resp.error?.code;
        if (
          errCode === "messaging/invalid-registration-token" ||
          errCode === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(activeTokens[idx]);
        }
      }
    });

    return { success: true, tokensToRemove };
  } catch (error) {
    console.error("❌ [FCM] Error sending push notification:", error);
    return { success: false, error };
  }
};

module.exports = {
  firebaseApp,
  sendPushNotification,
  isFirebaseEnabled: () => messaging !== null
};
