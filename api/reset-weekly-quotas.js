/**
 * Vercel Cron Job
 * Reset les quotas chaque lundi à 00:00 UTC
 * Endpoint: /api/reset-weekly-quotas (appelé automatiquement)
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
    const usersSnapshot = await db.collection('users').get();
    
    const batch = db.batch();
    let count = 0;

    usersSnapshot.docs.forEach((doc) => {
      const user = doc.data();
      const newQuota = getQuotaForPlan(user.subscriptionType || 'free');

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      batch.update(doc.ref, {
        quotaRemaining: newQuota,
        quotaResetDate: admin.firestore.Timestamp.fromDate(nextWeek),
      });
      
      count++;
    });

    await batch.commit();

    console.log(`Reset quotas for ${count} users`);
    return res.status(200).json({
      success: true,
      message: `Reset ${count} users`,
    });
  } catch (error) {
    console.error('Error resetting quotas:', error);
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
      return 999999;
    case 'free':
    default:
      return 5;
  }
}
