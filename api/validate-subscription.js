/**
 * Vercel Serverless Function
 * Valider un abonnement Google Play
 * Endpoint: /api/validate-subscription
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, purchaseToken, productId, subscriptionType } = req.body;

    if (!userId || !purchaseToken || !subscriptionType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = getFirestore();

    // Créer le document d'abonnement
    const subscriptionDoc = {
      userId: userId,
      plan: subscriptionType,
      status: 'active',
      startDate: admin.firestore.Timestamp.now(),
      googlePlayPurchaseToken: purchaseToken,
      lastValidatedAt: admin.firestore.Timestamp.now(),
    };

    await db.collection('subscriptions').add(subscriptionDoc);

    // Mettre à jour l'utilisateur
    const quota = getQuotaForPlan(subscriptionType);
    await db.collection('users').doc(userId).update({
      subscriptionType: subscriptionType,
      subscriptionStatus: 'active',
      quotaRemaining: quota,
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription validated',
    });
  } catch (error) {
    console.error('Error validating subscription:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

function getQuotaForPlan(plan) {
  switch (plan.toLowerCase()) {
    case 'standard':
      return 50;
    case 'premium':
      return 999999; // Unlimited
    case 'free':
    default:
      return 5;
  }
}
