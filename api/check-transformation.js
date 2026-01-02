/**
 * Vercel Endpoint - Check Transformation Status
 * Vérifie le statut d'une transformation en cours
 * Endpoint: /api/check-transformation
 */
const { getFirestore } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const taskId = req.method === 'GET' ? req.query.taskId : req.body.taskId;

  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId' });
  }

  try {
    const db = getFirestore();
    const transformationRef = db.collection('transformations').doc(taskId);
    const transformationDoc = await transformationRef.get();

    if (!transformationDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Transformation not found'
      });
    }

    const transformation = transformationDoc.data();

    return res.status(200).json({
      success: true,
      transformation: {
        taskId: taskId,
        status: transformation.status,
        style: transformation.style,
        prompt: transformation.prompt,
        originalImageUrl: transformation.originalImageUrl,
        transformedImageUrl: transformation.transformedImageUrl || null,
        errorMessage: transformation.errorMessage || null,
        createdAt: transformation.createdAt,
        completedAt: transformation.completedAt || null
      }
    });

  } catch (error) {
    console.error('Error checking transformation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
