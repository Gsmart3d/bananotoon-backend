/**
 * Vercel Serverless Function
 * Ajouter des crédits en mode DEBUG uniquement
 * Endpoint: /api/add-debug-credits
 *
 * ⚠️ À DÉSACTIVER EN PRODUCTION
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
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
    const { userId, credits } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const creditsToAdd = credits || 100; // Par défaut 100 crédits

    const db = getFirestore();

    // Transaction pour ajouter des crédits au quota
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const currentQuota = userDoc.data().quotaRemaining || 0;
      const newQuota = currentQuota + creditsToAdd;

      transaction.update(userRef, {
        quotaRemaining: newQuota,
      });
    });

    return res.status(200).json({
      success: true,
      message: `${creditsToAdd} credits added successfully`,
      creditsAdded: creditsToAdd
    });
  } catch (error) {
    console.error('Error adding debug credits:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
