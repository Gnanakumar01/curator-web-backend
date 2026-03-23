const admin = require("firebase-admin");

// ✅ USE ENV OR DIRECT JSON
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 🔥 ADD THIS (VERY IMPORTANT DEBUG)
admin.auth().listUsers(1)
  .then(() => console.log("Firebase Admin Connected"))
  .catch(err => console.error("❌ Firebase Admin Error:", err));

module.exports = admin;