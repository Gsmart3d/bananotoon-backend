/**
 * Vercel Endpoint - Universal AI Generation
 * Supports 150+ AI models via intelligent routing
 * Endpoint: /api/generate-image
 */
const { getFirestore, admin } = require('./_firebase');
const { routeRequest, calculateCreditsCost } = require('./_router');

/**
 * Handle LEGACY request (style-based, old app format)
 * For backward compatibility with existing Android app
 */
async function handleLegacyRequest(req, res, { userId, style, imageUrl, imageUrls, customPrompt, mode }) {
  try {
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentQuota = userData.quotaRemaining || 0;
    const creditsCost = style === 'video' ? 25 : 10;

    console.log('Current quota:', currentQuota);
    console.log('Credits cost:', creditsCost);

    if (currentQuota < creditsCost) {
      return res.status(403).json({
        error: 'Insufficient credits',
        message: `This requires ${creditsCost} credits. You have ${currentQuota} credits.`,
        required: creditsCost,
        available: currentQuota
      });
    }

    // Map legacy style to modelId
    let modelId, parameters;

    if (style === 'video') {
      modelId = 'wan-2-2-a14b-image-to-video-turbo';
      parameters = {
        image_url: imageUrl,
        prompt: customPrompt || 'smooth cinematic motion',
        duration: 5,
        aspect_ratio: '16:9',
        resolution: '720p'
      };
    } else {
      modelId = mode === 'generate' ? 'flux-2-pro-text-to-image' : 'flux-2-pro-image-to-image';
      parameters = {
        prompt: customPrompt || `Transform in ${style} style`,
        aspect_ratio: '1:1',
        resolution: '2K'
      };

      if (mode === 'edit' && imageUrl) {
        parameters.image_url = imageUrl;
      }
      if (imageUrls && imageUrls.length > 0) {
        parameters.image_url = imageUrls[0];
      }
    }

    // Use intelligent routing
    const host = req.headers.host || 'bananotoon-backend1.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    console.log('🔄 Routing legacy request:', { modelId, style, mode });

    const routeResult = await routeRequest(
      modelId,
      parameters,
      callbackUrl,
      process.env.KIE_API_KEY
    );

    if (!routeResult.success) {
      console.error('❌ Routing failed:', routeResult.result);
      return res.status(500).json({
        success: false,
        error: routeResult.result.msg || 'Generation failed',
        details: routeResult.result
      });
    }

    const taskId = routeResult.result.data?.taskId || routeResult.result.taskId;

    // Deduct credits
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost)
    });

    console.log(`✅ Legacy generation started - taskId: ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: `Generation started!`,
      creditsUsed: creditsCost,
      endpointUsed: routeResult.endpointUsed
    });

  } catch (error) {
    console.error('❌ Legacy request error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Handle DYNAMIC request (modelId + parameters, new system)
 * Supports ALL 150+ models via intelligent routing
 */
async function handleDynamicRequest(req, res, { userId, modelId, parameters }) {
  try {
    console.log('🚀 Dynamic request:', { userId, modelId, parametersCount: Object.keys(parameters || {}).length });

    // Get user and check credits
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentQuota = userData.quotaRemaining || 0;

    // Calculate credits cost using router
    const { findEndpointForModel, calculateCreditsCost } = require('./_router');
    const endpointConfig = findEndpointForModel(modelId);

    if (!endpointConfig) {
      return res.status(404).json({
        error: `Model not found: ${modelId}`,
        hint: 'Check available models in api-endpoints-mapping.json'
      });
    }

    const creditsCost = calculateCreditsCost(endpointConfig, parameters);

    console.log('Current quota:', currentQuota);
    console.log('Credits cost:', creditsCost);

    if (currentQuota < creditsCost) {
      return res.status(403).json({
        error: 'Insufficient credits',
        message: `This model requires ${creditsCost} credits. You have ${currentQuota} credits.`,
        required: creditsCost,
        available: currentQuota
      });
    }

    // Use intelligent routing
    const host = req.headers.host || 'bananotoon-backend1.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    const routeResult = await routeRequest(
      modelId,
      parameters,
      callbackUrl,
      process.env.KIE_API_KEY
    );

    if (!routeResult.success) {
      console.error('❌ Routing failed:', routeResult.result);
      return res.status(500).json({
        success: false,
        error: routeResult.result.msg || 'Generation failed',
        details: routeResult.result
      });
    }

    const taskId = routeResult.result.data?.taskId || routeResult.result.taskId;

    // Deduct credits
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost)
    });

    console.log(`✅ Dynamic generation started - taskId: ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: `${endpointConfig.name} generation started!`,
      modelName: endpointConfig.name,
      modelType: endpointConfig.category,
      creditsUsed: creditsCost,
      endpointUsed: routeResult.endpointUsed,
      estimatedTime: endpointConfig.category === 'video' ? '30-90 seconds' : '10-30 seconds'
    });

  } catch (error) {
    console.error('❌ Dynamic request error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = async (req, res) => {
  console.log('🚀 GENERATE-IMAGE.JS - UNIVERSAL AI GENERATION (150+ Models)');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, modelId, parameters, style, imageUrl, imageUrls, customPrompt, mode } = req.body;

  console.log('=== REQUEST ===');
  console.log('userId:', userId);
  console.log('modelId:', modelId);
  console.log('style:', style);
  console.log('parameters:', parameters ? Object.keys(parameters) : 'none');

  // Validate userId
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // LEGACY MODE: If style is provided (old app format)
  if (style && !modelId) {
    console.log('📱 LEGACY MODE: Using style-based generation');
    return handleLegacyRequest(req, res, { userId, style, imageUrl, imageUrls, customPrompt, mode });
  }

  // DYNAMIC MODE: If modelId is provided (new dynamic system)
  if (modelId) {
    console.log('🚀 DYNAMIC MODE: Using intelligent routing');
    if (!parameters) return res.status(400).json({ error: 'Missing parameters for dynamic mode' });
    return handleDynamicRequest(req, res, { userId, modelId, parameters });
  }

  // Neither style nor modelId provided
  return res.status(400).json({ error: 'Missing either style (legacy) or modelId (dynamic)' });
};
