/**
 * Create or update test user with credits
 * FOR TESTING ONLY
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, initialCredits = 1000 } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // User exists, just add credits
      await userRef.update({
        quotaRemaining: admin.firestore.FieldValue.increment(initialCredits),
        lastUpdated: admin.firestore.Timestamp.now()
      });

      const updated = await userRef.get();
      return res.status(200).json({
        success: true,
        message: 'Test user updated',
        userId: userId,
        quotaRemaining: updated.data().quotaRemaining
      });
    } else {
      // Create new test user
      await userRef.set({
        userId: userId,
        email: `${userId}@test.bananotoon.app`,
        displayName: 'Test User',
        quotaRemaining: initialCredits,
        createdAt: admin.firestore.Timestamp.now(),
        isTestUser: true
      });

      return res.status(201).json({
        success: true,
        message: 'Test user created',
        userId: userId,
        quotaRemaining: initialCredits
      });
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
