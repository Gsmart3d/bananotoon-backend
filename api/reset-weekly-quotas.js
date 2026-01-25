/**
 * Vercel Cron Job
 * Reset les crédits des abonnés chaque semaine
 * Endpoint: /api/reset-weekly-quotas (appelé automatiquement)
 *
 * NOUVEAU SYSTÈME:
 * - Free users: PAS de reset (2 crédits lifetime)
 * - Standard: Reset à 50 crédits par semaine
 * - Premium: Unlimited (pas de reset nécessaire)
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  // Vérifier que c'est bien Vercel Cron qui appelle
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getFirestore();
    const now = admin.firestore.Timestamp.now();

    // Chercher les users qui ont besoin de renouvellement
    const usersSnapshot = await db.collection('users')
      .where('creditsResetAt', '<=', now)
      .get();

    const batch = db.batch();
    let standardCount = 0;

    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();

      // Seulement pour Standard (Premium a unlimited, Free n'a pas de reset)
      if (user.subscriptionTier === 'standard') {
        const nextReset = new Date();
        nextReset.setDate(nextReset.getDate() + 7);

        batch.update(doc.ref, {
          totalCredits: 50, // Reset à 50 crédits
          creditsResetAt: admin.firestore.Timestamp.fromDate(nextReset),
        });

        standardCount++;
      }
    });

    await batch.commit();

    console.log(`Reset credits for ${standardCount} Standard users`);
    return res.status(200).json({
      success: true,
      message: `Reset ${standardCount} Standard users`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error resetting credits:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
