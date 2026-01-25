/**
 * Vercel Serverless Function
 * Donner 1 crédit gratuit après avoir regardé une pub
 * Endpoint: /api/award-ad-credit
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
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const db = getFirestore();
    
    // Transaction pour ajouter 1 crédit
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      transaction.update(userRef, {
        totalCredits: admin.firestore.FieldValue.increment(1),
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Credit awarded',
    });
  } catch (error) {
    console.error('Error awarding credit:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
