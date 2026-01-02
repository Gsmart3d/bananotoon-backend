/**
 * Vercel Cron Job
 * Nettoie les vieilles transformations (6+ mois) des utilisateurs Free
 * Endpoint: /api/cleanup-old-transformations (appelé automatiquement)
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getFirestore();
    
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const oldTransformations = await db
      .collection('transformations')
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sixMonthsAgo))
      .get();

    const batch = db.batch();
    let count = 0;

    oldTransformations.docs.forEach((doc) => {
      const transformation = doc.data();
      // Supprimer seulement pour les utilisateurs Free
      if (transformation.subscriptionTypeAtCreation === 'free') {
        batch.delete(doc.ref);
        count++;
      }
    });

    await batch.commit();

    console.log(`Cleaned up ${count} old transformations`);
    return res.status(200).json({
      success: true,
      message: `Cleaned up ${count} transformations`,
    });
  } catch (error) {
    console.error('Error cleaning up:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
