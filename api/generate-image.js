/**
 * Vercel Endpoint - Transform with Dynamic Models
 * Supports 106+ AI models via modelId + parameters
 * Endpoint: /api/transform
 */
const { getFirestore, admin } = require('./_firebase');
const fs = require('fs');
const path = require('path');

// Load models catalog
let modelsCatalog = null;
function loadModelsCatalog() {
  if (modelsCatalog) return modelsCatalog;
  try {
    const categoryFiles = ['image-models.json', 'video-models.json', 'audio-models.json', 'chat-models.json', 'enhancement-models.json', 'avatar-models.json'];
    const allModels = [];
    categoryFiles.forEach(filename => {
      try {
        const filePath = path.join(__dirname, '..', filename);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const categoryData = JSON.parse(fileData);
        allModels.push(...categoryData.models);
      } catch (err) { console.warn(`Failed to load ${filename}:`, err.message); }
    });
    modelsCatalog = { version: '1.0.0', models: allModels };
    return modelsCatalog;
  } catch (error) {
    console.error('Error loading models catalog:', error);
    return null;
  }
}

function findModelById(modelId) {
  const catalog = loadModelsCatalog();
  return catalog?.models?.find(model => model.id === modelId);
}

function getModelCreditsCost(model) {
  if (!model?.pricing) return 10;
  const tier = model.pricing.standard || model.pricing.pro;
  return tier?.credits_per_image || tier?.credits_per_second || tier?.credits_per_1000_chars || 10;
}

function buildInputFromParameters(model, userParameters) {
  const input = {};
  Object.keys(userParameters).forEach(key => { input[key] = userParameters[key]; });
  if (model.parameters?.optional) {
    Object.entries(model.parameters.optional).forEach(([key, param]) => {
      if (!input[key] && param.default !== undefined) input[key] = param.default;
    });
  }
  return input;
}

/**
 * Handle LEGACY request (style-based, old app format)
 * Supports: style="video", style="neutral", etc.
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
    const creditsCost = style === 'video' ? 25 : 10; // Video costs more

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

    // Build endpoint and input based on style
    let endpoint, channel, input;

    if (style === 'video') {
      // Video generation
      endpoint = '/wan/2-2-a14b-image-to-video-turbo';
      channel = 'wan_request';
      input = {
        image_url: imageUrl,
        prompt: customPrompt || 'smooth cinematic motion',
        duration: 5,
        aspect_ratio: '16:9',
        resolution: '720p'
      };
    } else {
      // Image generation with nano-banana or nano-banana-pro
      endpoint = mode === 'generate' ? '/fal-ai/nano-banana/text-to-image' : '/fal-ai/nano-banana/image-to-image';
      channel = 'fal_request';

      input = {
        prompt: customPrompt || `Transform in ${style} style`,
        image_size: 'square_hd'
      };

      if (mode === 'edit' && imageUrl) {
        input.image_url = imageUrl;
      }
      if (imageUrls && imageUrls.length > 0) {
        input.image_url = imageUrls[0]; // Use first image
      }
    }

    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;
    input.callBackUrl = callbackUrl;

    console.log('KIE.AI Request:', { endpoint, channel, input });

    // Call KIE.AI API
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.KIE_AI_KEY
      },
      body: JSON.stringify({ endpoint, channel, input })
    });

    const kieResult = await kieResponse.json();

    if (!kieResult.success || !kieResult.data?.taskId) {
      console.error('KIE.AI error:', kieResult);
      return res.status(500).json({
        success: false,
        error: kieResult.error || 'KIE.AI request failed',
        details: kieResult
      });
    }

    const taskId = kieResult.data.taskId;

    // Deduct credits
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost)
    });

    console.log(`✅ Legacy generation started - taskId: ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: `Generation started!`,
      creditsUsed: creditsCost
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
 */
async function handleDynamicRequest(req, res, { userId, modelId, parameters }) {
  try {
    // Find model in catalog
    const model = findModelById(modelId);
    if (!model) {
      console.error('Model not found:', modelId);
      return res.status(404).json({ error: `Model not found: ${modelId}` });
    }

    console.log('Found model:', model.name);

    // Get user and check credits
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentQuota = userData.quotaRemaining || 0;
    const creditsCost = getModelCreditsCost(model);

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

    // Build input
    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;
    const input = buildInputFromParameters(model, parameters);

    // Add callback URL if model supports it
    if (model.parameters?.optional?.callBackUrl || model.parameters?.required?.callBackUrl) {
      input.callBackUrl = callbackUrl;
    }

    console.log('Final input:', JSON.stringify(input, null, 2));

    // Call KIE.AI API
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.KIE_AI_KEY
      },
      body: JSON.stringify({
        endpoint: model.endpoint,
        channel: model.channel || 'fal_request',
        input: input
      })
    });

    const kieResult = await kieResponse.json();

    if (!kieResult.success || !kieResult.data?.taskId) {
      console.error('KIE.AI error:', kieResult);
      return res.status(500).json({
        success: false,
        error: kieResult.error || 'KIE.AI request failed',
        details: kieResult
      });
    }

    const taskId = kieResult.data.taskId;

    // Deduct credits
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost)
    });

    console.log(`✅ Dynamic generation started - taskId: ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId: taskId,
      message: `${model.name} generation started!`,
      modelName: model.name,
      modelType: model.type,
      creditsUsed: creditsCost,
      estimatedTime: model.type === 'video' ? '30-90 seconds' : '10-30 seconds'
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
  console.log('🚀 GENERATE-IMAGE.JS - HYBRID ENDPOINT (Legacy + Dynamic)');

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
  console.log('parameters:', parameters);
  console.log('imageUrl:', imageUrl);
  console.log('mode:', mode);

  // Validate userId
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  // LEGACY MODE: If style is provided (old app format)
  if (style && !modelId) {
    console.log('📱 LEGACY MODE: Using style-based generation');
    return handleLegacyRequest(req, res, { userId, style, imageUrl, imageUrls, customPrompt, mode });
  }

  // DYNAMIC MODE: If modelId is provided (new dynamic system)
  if (modelId) {
    console.log('🚀 DYNAMIC MODE: Using modelId + parameters');
    if (!parameters) return res.status(400).json({ error: 'Missing parameters for dynamic mode' });
    return handleDynamicRequest(req, res, { userId, modelId, parameters });
  }

  // Neither style nor modelId provided
  return res.status(400).json({ error: 'Missing either style (legacy) or modelId (dynamic)' });
};
