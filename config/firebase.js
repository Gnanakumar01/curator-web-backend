const admin = require("firebase-admin");

// ✅ USE ENVIRONMENT VARIABLES (safer for production)
// Support both JSON file and environment variables
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Parse from environment variable (JSON string)
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Fallback to JSON file for local development
  try {
    serviceAccount = require("../serviceAccountKey.json");
  } catch (err) {
    console.error("Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT env var or add serviceAccountKey.json");
    throw err;
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 🔥 ADD THIS (VERY IMPORTANT DEBUG)
admin.auth().listUsers(1)
  .then(() => console.log("Firebase Admin Connected"))
  .catch(err => console.error("❌ Firebase Admin Error:", err));

module.exports = admin;