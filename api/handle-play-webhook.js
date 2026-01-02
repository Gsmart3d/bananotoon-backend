/**
 * Vercel Serverless Function
 * Webhook pour Google Play Real-Time Developer Notifications
 * Endpoint: /api/handle-play-webhook
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const message = req.body.message;
    if (!message) {
      return res.status(400).send('No message');
    }

    // Décoder le message Pub/Sub
    const data = JSON.parse(
      Buffer.from(message.data, 'base64').toString()
    );

    const { subscriptionNotification } = data;
    if (!subscriptionNotification) {
      return res.status(200).send('OK');
    }

    const { purchaseToken, notificationType } = subscriptionNotification;

    const db = getFirestore();

    // Gérer les différents types de notifications
    switch (notificationType) {
      case 1: // SUBSCRIPTION_RECOVERED
      case 2: // SUBSCRIPTION_RENEWED
        await handleSubscriptionRenewed(db, purchaseToken);
        break;
      case 3: // SUBSCRIPTION_CANCELED
        await handleSubscriptionCanceled(db, purchaseToken);
        break;
      case 13: // SUBSCRIPTION_EXPIRED
        await handleSubscriptionExpired(db, purchaseToken);
        break;
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling webhook:', error);
    return res.status(500).send('Error');
  }
};

async function handleSubscriptionRenewed(db, purchaseToken) {
  const subscriptionQuery = await db
    .collection('subscriptions')
    .where('googlePlayPurchaseToken', '==', purchaseToken)
    .get();

  if (!subscriptionQuery.empty) {
    const subscriptionDoc = subscriptionQuery.docs[0];
    const userId = subscriptionDoc.data().userId;

    await subscriptionDoc.ref.update({
      status: 'active',
      lastValidatedAt: admin.firestore.Timestamp.now(),
    });

    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'active',
    });
  }
}

async function handleSubscriptionCanceled(db, purchaseToken) {
  const subscriptionQuery = await db
    .collection('subscriptions')
    .where('googlePlayPurchaseToken', '==', purchaseToken)
    .get();

  if (!subscriptionQuery.empty) {
    const subscriptionDoc = subscriptionQuery.docs[0];
    const userId = subscriptionDoc.data().userId;

    await subscriptionDoc.ref.update({
      status: 'canceled',
      lastValidatedAt: admin.firestore.Timestamp.now(),
    });

    await db.collection('users').doc(userId).update({
      subscriptionStatus: 'canceled',
    });
  }
}

async function handleSubscriptionExpired(db, purchaseToken) {
  const subscriptionQuery = await db
    .collection('subscriptions')
    .where('googlePlayPurchaseToken', '==', purchaseToken)
    .get();

  if (!subscriptionQuery.empty) {
    const subscriptionDoc = subscriptionQuery.docs[0];
    const userId = subscriptionDoc.data().userId;

    await subscriptionDoc.ref.update({
      status: 'expired',
      lastValidatedAt: admin.firestore.Timestamp.now(),
    });

    await db.collection('users').doc(userId).update({
      subscriptionType: 'free',
      subscriptionStatus: 'expired',
      quotaRemaining: 5,
    });
  }
}
