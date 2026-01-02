// Configuration Firebase Admin (partagée par toutes les fonctions)
const admin = require('firebase-admin');

let firebaseApp;

function initFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: privateKey,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });

  return firebaseApp;
}

function getFirestore() {
  initFirebase();
  return admin.firestore();
}

module.exports = { initFirebase, getFirestore, admin };
