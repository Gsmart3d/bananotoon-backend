// Configuration Firebase Admin (partagée par toutes les fonctions)
const admin = require('firebase-admin');

let firebaseApp;

function initFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Support both FIREBASE_SERVICE_ACCOUNT (single JSON) and separate variables
  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Use single JSON service account (preferred)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else {
    // Fallback to separate variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : undefined;

    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
  }

  firebaseApp = admin.initializeApp({ credential });

  return firebaseApp;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

module.exports = { initFirebase, getFirestore, admin };
