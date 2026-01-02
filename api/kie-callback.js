/**
 * Vercel Endpoint - KIE.AI Callback
 * Reçoit les résultats de KIE.AI quand la génération est terminée
 * Endpoint: /api/kie-callback
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { taskId, state, resultJson, failMsg } = req.body.data || req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'Missing taskId' });
    }

    const db = getFirestore();
    const transformationRef = db.collection('transformations').doc(taskId);
    const transformationDoc = await transformationRef.get();

    if (!transformationDoc.exists) {
      console.log(`Transformation ${taskId} not found, creating new entry`);
      // Si la transformation n'existe pas, on peut la créer ou ignorer
      return res.status(200).json({ success: true, message: 'Task not found but acknowledged' });
    }

    // Parser le resultJson si c'est une string
    let resultUrls = [];
    if (resultJson) {
      const parsedResult = typeof resultJson === 'string' ? JSON.parse(resultJson) : resultJson;
      resultUrls = parsedResult.resultUrls || [];
    }

    // Mettre à jour la transformation
    const updateData = {
      status: state === 'success' ? 'completed' : 'failed',
      completedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (state === 'success' && resultUrls.length > 0) {
      updateData.transformedImageUrl = resultUrls[0];
    } else if (state === 'failed') {
      updateData.errorMessage = failMsg || 'Unknown error';
    }

    await transformationRef.update(updateData);

    console.log(`Transformation ${taskId} updated: ${state}`);

    return res.status(200).json({
      success: true,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('Error processing callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
