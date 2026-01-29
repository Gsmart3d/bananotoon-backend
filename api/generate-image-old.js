/**
 * Vercel Endpoint - Transform with Dynamic Models
 * Supports 106+ AI models via modelId + parameters
 * Endpoint: /api/transform
 */
const { getFirestore, admin } = require('./_firebase');

// Load models catalog using require() (works on Vercel serverless)
let modelsCatalog = null;
function loadModelsCatalog() {
  if (modelsCatalog) return modelsCatalog;
  try {
    const allModels = [];

    // Use require() instead of fs.readFileSync() for Vercel compatibility
    try {
      const imageModels = require('../image-models.json');
      console.log(`Loaded ${imageModels.models.length} image models`);
      allModels.push(...imageModels.models);
    } catch (err) { console.error('Failed to load image-models.json:', err.message); }

    try {
      const videoModels = require('../video-models.json');
      console.log(`Loaded ${videoModels.models.length} video models`);
      allModels.push(...videoModels.models);
    } catch (err) { console.error('Failed to load video-models.json:', err.message); }

    try {
      const audioModels = require('../audio-models.json');
      console.log(`Loaded ${audioModels.models.length} audio models`);
      allModels.push(...audioModels.models);
    } catch (err) { console.error('Failed to load audio-models.json:', err.message); }

    try {
      const chatModels = require('../chat-models.json');
      console.log(`Loaded ${chatModels.models.length} chat models`);
      allModels.push(...chatModels.models);
    } catch (err) { console.error('Failed to load chat-models.json:', err.message); }

    try {
      const enhancementModels = require('../enhancement-models.json');
      console.log(`Loaded ${enhancementModels.models.length} enhancement models`);
      allModels.push(...enhancementModels.models);
    } catch (err) { console.error('Failed to load enhancement-models.json:', err.message); }

    try {
      const avatarModels = require('../avatar-models.json');
      console.log(`Loaded ${avatarModels.models.length} avatar models`);
      allModels.push(...avatarModels.models);
    } catch (err) { console.error('Failed to load avatar-models.json:', err.message); }

    modelsCatalog = { version: '1.0.0', models: allModels };
    console.log(`✅ Total models loaded: ${allModels.length}`);
    return modelsCatalog;
  } catch (error) {
    console.error('❌ Error loading models catalog:', error);
    return { version: '1.0.0', models: [] };
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

  // Add user-provided parameters
  Object.keys(userParameters).forEach(key => { input[key] = userParameters[key]; });

  // Add defaults for REQUIRED parameters if not provided
  if (model.parameters?.required) {
    Object.entries(model.parameters.required).forEach(([key, param]) => {
      if (!input[key] && param.default !== undefined && key !== 'model') {
        input[key] = param.default;
        console.log(`Adding required default: ${key} = ${param.default}`);
      }
    });
  }

  // Add defaults for OPTIONAL parameters if not provided
  if (model.parameters?.optional) {
    Object.entries(model.parameters.optional).forEach(([key, param]) => {
      if (!input[key] && param.default !== undefined) {
        input[key] = param.default;
        console.log(`Adding optional default: ${key} = ${param.default}`);
      }
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

    // Build model name and input based on style
    let modelName, input;

    if (style === 'video') {
      // Video generation
      modelName = 'wan/2-2-a14b-image-to-video-turbo';
      input = {
        image_url: imageUrl,
        prompt: customPrompt || 'smooth cinematic motion',
        duration: 5,
        aspect_ratio: '16:9',
        resolution: '720p'
      };
    } else {
      // Image generation with Flux-2-Pro (best quality)
      modelName = mode === 'generate' ? 'flux-2/pro-text-to-image' : 'flux-2/pro-image-to-image';

      input = {
        prompt: customPrompt || `Transform in ${style} style`,
        aspect_ratio: '1:1',
        resolution: '2K'
      };

      if (mode === 'edit' && imageUrl) {
        input.image_url = imageUrl;
      }
      if (imageUrls && imageUrls.length > 0) {
        input.image_url = imageUrls[0]; // Use first image
      }
    }

    const host = req.headers.host || 'bananotoon-backend1.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;
    input.callBackUrl = callbackUrl;

    console.log('KIE.AI Request:', { model: modelName, callbackUrl, input });

    // Call KIE.AI API (CORRECT FORMAT)
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        callBackUrl: callbackUrl,
        input: input
      })
    });

    const kieResult = await kieResponse.json();

    if (kieResult.code !== 200) {
      console.error('KIE.AI error:', kieResult);
      return res.status(500).json({
        success: false,
        error: kieResult.msg || 'KIE.AI request failed',
        details: kieResult
      });
    }

    const taskId = kieResult.data?.taskId || kieResult.taskId;

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
    const host = req.headers.host || 'bananotoon-backend1.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;
    const input = buildInputFromParameters(model, parameters);

    // Always add callback URL
    input.callBackUrl = callbackUrl;

    console.log('Final input:', JSON.stringify(input, null, 2));

    // Get actual model name from catalog (not endpoint!)
    // Some models use "default", others use "value" (like ElevenLabs)
    // Check both required AND optional parameters
    const modelName = model.parameters?.required?.model?.default ||
                      model.parameters?.required?.model?.value ||
                      model.parameters?.optional?.model?.default ||
                      model.parameters?.optional?.model?.value ||
                      model.endpoint;

    // Remove "model" from input if it exists (it goes in top-level body)
    const cleanInput = { ...input };
    delete cleanInput.model;

    console.log('Using model name:', modelName);
    console.log('Clean input:', JSON.stringify(cleanInput, null, 2));

    // Call KIE.AI API (CORRECT FORMAT)
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
      },
      body: JSON.stringify({
        model: modelName,
        callBackUrl: cleanInput.callBackUrl,
        input: cleanInput
      })
    });

    const kieResult = await kieResponse.json();

    if (kieResult.code !== 200) {
      console.error('KIE.AI error:', kieResult);
      return res.status(500).json({
        success: false,
        error: kieResult.msg || 'KIE.AI request failed',
        details: kieResult
      });
    }

    const taskId = kieResult.data?.taskId || kieResult.taskId;

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
