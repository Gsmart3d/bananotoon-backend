/**
 * Vercel Endpoint - Generate Video (image-to-video)
 * Génère une vidéo depuis une image avec API KIE.AI wan/2-6-image-to-video
 * Endpoint: /api/generate-video
 */
const { getFirestore, admin } = require('./_firebase');

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, imageUrl, customPrompt, duration, resolution } = req.body;

  if (!userId || !imageUrl) {
    return res.status(400).json({ error: 'Missing userId or imageUrl' });
  }

  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Vérifier les quotas
    if (userData.subscriptionType === 'FREE' && userData.quotaRemaining <= 0) {
      return res.status(403).json({
        error: 'Quota exceeded',
        message: 'You have reached your weekly limit. Upgrade or watch an ad!'
      });
    }

    if (userData.subscriptionType === 'STANDARD' && userData.quotaRemaining <= 0) {
      return res.status(403).json({
        error: 'Quota exceeded',
        message: 'You have reached your weekly limit.'
      });
    }

    // Préparer le prompt final
    const finalPrompt = customPrompt || 'A cinematic video transformation of this image with smooth camera movement';
    const videoDuration = duration || "5";
    const videoResolution = resolution || "1080p";

    // Callback URL Vercel
    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    // DEBUG LOG
    console.log('=== BACKEND GENERATE-VIDEO ===');
    console.log('userId:', userId);
    console.log('imageUrl:', imageUrl);
    console.log('prompt:', finalPrompt);
    console.log('duration:', videoDuration);
    console.log('resolution:', videoResolution);
    console.log('model: wan/2-6-image-to-video');
    console.log('==============================');

    // Appeler KIE.AI avec le modèle wan/2-6-image-to-video
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
      },
      body: JSON.stringify({
        model: "wan/2-6-image-to-video",
        callBackUrl: callbackUrl,
        input: {
          prompt: finalPrompt,
          image_urls: [imageUrl],
          duration: videoDuration,
          resolution: videoResolution,
          multi_shots: false
        }
      })
    });

    const kieResult = await kieResponse.json();

    if (kieResult.code !== 200) {
      console.error('KIE.AI API error:', kieResult);
      return res.status(500).json({
        error: 'KIE.AI API error',
        details: kieResult.msg
      });
    }

    const taskId = kieResult.data.taskId;

    // Décrémenter le quota
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-1)
    });

    // Sauvegarder la transformation en pending
    const transformationRef = db.collection('transformations').doc(taskId);
    await transformationRef.set({
      userId: userId,
      taskId: taskId,
      type: 'video', // Marquer comme vidéo
      prompt: finalPrompt,
      originalImageUrl: imageUrl,
      duration: videoDuration,
      resolution: videoResolution,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      subscriptionTypeAtCreation: userData.subscriptionType
    });

    console.log(`✅ Video generation started - taskId: ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: 'Video generation started! This may take 30-60 seconds.',
      estimatedTime: '30-60 seconds'
    });

  } catch (error) {
    console.error('❌ Error generating video:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
