const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");
// Download this JSON from Firebase console > Project Settings > Service Accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
