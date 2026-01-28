/**
 * Vercel Endpoint - Generate with Any Model
 * Génère du contenu (image/video/music/voice) avec n'importe quel modèle du catalogue
 * Endpoint: /api/generate-with-model
 *
 * Body parameters:
 * - userId: string (required)
 * - modelId: string (required) - ID du modèle depuis models-catalog.json
 * - parameters: object (required) - Paramètres spécifiques au modèle
 */
const { getFirestore, admin } = require('./_firebase');
const fs = require('fs');
const path = require('path');

// Load models catalog from multiple category files
let modelsCatalog = null;

function loadModelsCatalog() {
  if (modelsCatalog) return modelsCatalog;

  try {
    const categoryFiles = [
      'image-models.json',
      'video-models.json',
      'audio-models.json',
      'chat-models.json',
      'enhancement-models.json',
      'avatar-models.json'
    ];

    const allModels = [];

    categoryFiles.forEach(filename => {
      try {
        const filePath = path.join(__dirname, '..', filename);
        const fileData = fs.readFileSync(filePath, 'utf8');
        const categoryData = JSON.parse(fileData);
        allModels.push(...categoryData.models);
      } catch (err) {
        console.warn(`Failed to load ${filename}:`, err.message);
      }
    });

    modelsCatalog = {
      version: '1.0.0',
      models: allModels
    };

    console.log(`✅ Loaded ${allModels.length} models from ${categoryFiles.length} category files`);
    return modelsCatalog;
  } catch (error) {
    console.error('Error loading models catalog:', error);
    return null;
  }
}

// Find model by ID in catalog
function findModelById(modelId) {
  const catalog = loadModelsCatalog();
  if (!catalog || !catalog.models) return null;

  return catalog.models.find(model => model.id === modelId);
}

// Calculate credits cost for a model
function getModelCreditsCost(model) {
  if (!model || !model.pricing) return 10; // Default fallback

  // Check standard pricing first
  if (model.pricing.standard) {
    const tier = model.pricing.standard;
    return tier.credits_per_image || tier.credits_per_second || tier.credits_per_1000_chars || 10;
  }

  // Fallback to pro pricing if standard not available
  if (model.pricing.pro) {
    const tier = model.pricing.pro;
    return tier.credits_per_image || tier.credits_per_second || tier.credits_per_1000_chars || 20;
  }

  return 10;
}

// Build KIE.AI input object from model parameters
function buildInputFromParameters(model, userParameters) {
  const input = {};

  // Add all user-provided parameters
  Object.keys(userParameters).forEach(key => {
    input[key] = userParameters[key];
  });

  // Add default values for optional parameters not provided
  if (model.parameters && model.parameters.optional) {
    Object.entries(model.parameters.optional).forEach(([key, param]) => {
      if (!input[key] && param.default !== undefined) {
        input[key] = param.default;
      }
    });
  }

  return input;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, modelId, parameters } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    if (!modelId) {
      return res.status(400).json({ error: 'Missing modelId' });
    }

    if (!parameters || typeof parameters !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid parameters' });
    }

    // Find model in catalog
    const model = findModelById(modelId);
    if (!model) {
      return res.status(404).json({ error: `Model not found: ${modelId}` });
    }

    console.log('=== GENERATE WITH MODEL ===');
    console.log('userId:', userId);
    console.log('modelId:', modelId);
    console.log('model name:', model.name);
    console.log('model type:', model.type);
    console.log('model endpoint:', model.endpoint);
    console.log('parameters:', JSON.stringify(parameters, null, 2));

    // Check user credits
    const db = getFirestore();
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentQuota = userData.quotaRemaining || 0;

    // Calculate credits cost
    const creditsCost = getModelCreditsCost(model);

    console.log('Current user quota:', currentQuota);
    console.log('Credits cost:', creditsCost);

    // Check if user has enough credits
    if (currentQuota < creditsCost) {
      return res.status(403).json({
        error: 'Insufficient credits',
        message: `This model requires ${creditsCost} credits. You have ${currentQuota} credits.`,
        required: creditsCost,
        available: currentQuota
      });
    }

    // Build callback URL
    const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
    const callbackUrl = `https://${host}/api/kie-callback`;

    // Build input object for KIE.AI
    const input = buildInputFromParameters(model, parameters);

    console.log('KIE.AI request:');
    console.log('- endpoint:', model.endpoint);
    console.log('- input:', JSON.stringify(input, null, 2));
    console.log('- callback:', callbackUrl);

    // Call KIE.AI API
    const kieResponse = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`
      },
      body: JSON.stringify({
        model: model.endpoint,
        callBackUrl: callbackUrl,
        input: input
      })
    });

    const kieResult = await kieResponse.json();

    console.log('KIE.AI response:', JSON.stringify(kieResult, null, 2));

    if (kieResult.code !== 200) {
      console.error('KIE.AI API error:', kieResult);
      return res.status(500).json({
        error: 'KIE.AI API error',
        details: kieResult.msg || 'Unknown error'
      });
    }

    const taskId = kieResult.data.taskId;

    // Deduct credits
    await userRef.update({
      quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost)
    });

    console.log(`✅ Credits deducted: -${creditsCost}`);

    // Save transformation to Firestore
    const transformationRef = db.collection('transformations').doc(taskId);
    await transformationRef.set({
      userId: userId,
      taskId: taskId,
      type: model.type,
      modelId: modelId,
      modelName: model.name,
      modelEndpoint: model.endpoint,
      parameters: parameters,
      creditsCost: creditsCost,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
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
    console.error('❌ Error in generate-with-model:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
