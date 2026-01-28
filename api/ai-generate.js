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

module.exports = async (req, res) => {
  console.log('🚀 TRANSFORM.JS - DYNAMIC MODELS ENDPOINT');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, modelId, parameters } = req.body;

  console.log('=== TRANSFORM REQUEST ===');
  console.log('userId:', userId);
  console.log('modelId:', modelId);
  console.log('parameters:', parameters);

  // Validate request
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  if (!modelId) return res.status(400).json({ error: 'Missing modelId' });
  if (!parameters) return res.status(400).json({ error: 'Missing parameters' });

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
    const kieResponse = await fetch('https://api.kie.ai/v1/jobs/createTask', {
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

    console.log(`✅ Generation started - taskId: ${taskId}`);

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
    console.error('❌ Transform error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
