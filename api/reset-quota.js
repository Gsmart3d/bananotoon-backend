/**
 * Vercel Endpoint - Reset User Quota
 * Réinitialise le quota d'un utilisateur
 * Endpoint: /api/reset-quota
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, newQuota } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const quotaToSet = newQuota || 999;

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);

    await userRef.update({
      quotaRemaining: quotaToSet
    });

    return res.status(200).json({
      success: true,
      message: `Quota reset to ${quotaToSet} for user ${userId}`
    });
  } catch (error) {
    console.error('Error resetting quota:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
