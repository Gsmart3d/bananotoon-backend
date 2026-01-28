/**
 * Vercel Endpoint - Generate Image (text-to-image)
 * Génère une image depuis un prompt avec API KIE.AI
 * ALSO supports dynamic models (106+ models) via modelId + parameters
 * Endpoint: /api/generate-image
 *
 * VERSION: 2.0.0 - DYNAMIC MODELS SUPPORT
 * Last updated: 2026-01-28
 */
const { getFirestore, admin } = require('./_firebase');
const fs = require('fs');
const path = require('path');

// Load models catalog for dynamic model support
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

// Master prompts pour transformer la référence dans le style choisi
const STYLE_PROMPTS = {
  neutral: 'high quality professional photography, preserve all facial features and details, maintain original composition and style, realistic rendering, natural lighting',
  pixar: 'turn this character into Pixar 3D animation style, preserve facial features and identity, smooth CGI rendering, expressive eyes, vibrant colors, Disney-Pixar quality, professional character design, maintain pose and composition',
  manga: 'transform this character into Japanese manga style, preserve facial features and expression, black and white ink art, dynamic screentone shading, bold linework, expressive manga eyes, detailed hair strands, professional manga artist quality',
  anime: 'convert this character into anime style, keep facial structure and identity, vibrant cel-shaded colors, detailed anime shading, beautiful character design, sharp linework, expressive anime eyes, studio-quality animation style',
  cartoon: 'turn this character into modern cartoon style, preserve character likeness, bold clean outlines, flat vibrant colors, simplified features, playful expression, professional cartoon illustration',
  watercolor: 'transform this portrait into watercolor painting, maintain facial features and expression, soft watercolor brushstrokes, flowing colors, artistic paper texture, dreamy atmospheric painting, traditional art style',
  oilpainting: 'convert this portrait into classical oil painting, preserve facial structure and likeness, rich oil paint textures, masterful brushwork, renaissance painting technique, museum-quality portrait art, deep colors and lighting',
  sketch: 'turn this portrait into detailed pencil sketch, keep facial features accurate, professional sketching technique, varied pencil strokes, artistic shading and hatching, hand-drawn illustration quality, graphite on paper look',
  comic: 'transform this character into American comic book style, preserve character identity, bold ink outlines, vibrant comic colors, dramatic cel shading, superhero comic aesthetic, professional comic art quality',
  fantasy: 'convert this character into fantasy art style, maintain facial features, magical ethereal atmosphere, epic fantasy painting, dramatic lighting, mystical elements, professional fantasy illustration, rich detailed rendering',
  cyberpunk: 'turn this character into cyberpunk style, keep character likeness, neon lighting effects, futuristic tech elements, cyberpunk aesthetic, dramatic sci-fi atmosphere, high-tech urban background, professional digital art',
  retro: 'transform this character into retro 80s style, preserve facial features, vibrant neon colors, synthwave aesthetic, vintage 80s vibe, nostalgic retro art style, bold graphic design, professional retro illustration'
};

module.exports = async (req, res) => {
  console.log('🚀 GENERATE-IMAGE.JS v2.0.0 - DYNAMIC MODELS LOADED');

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, modelId, parameters, style, customPrompt, imageUrl, imageUrls, mode, image_size, isPro, duration, resolution } = req.body;

  // DEBUG: Log received data
  console.log('=== REQUEST RECEIVED v2.0 ===');
  console.log('userId:', userId);
  console.log('modelId:', modelId);
  console.log('parameters:', parameters);
  console.log('style:', style);
  console.log('Has modelId?', !!modelId);
  console.log('Has parameters?', !!parameters);
  console.log('========================');

  // === DYNAMIC MODEL MODE (NEW: 106+ models support) ===
  if (modelId && parameters) {
    try {
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const model = findModelById(modelId);
      if (!model) return res.status(404).json({ error: `Model not found: ${modelId}` });

      console.log('=== DYNAMIC MODEL GENERATION ===');
      console.log('userId:', userId);
      console.log('modelId:', modelId);
      console.log('model:', model.name);
      console.log('parameters:', JSON.stringify(parameters, null, 2));

      const db = getFirestore();
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

      const userData = userDoc.data();
      const currentQuota = userData.quotaRemaining || 0;
      const creditsCost = getModelCreditsCost(model);

      if (currentQuota < creditsCost) {
        return res.status(403).json({
          error: 'Insufficient credits',
          message: `This model requires ${creditsCost} credits. You have ${currentQuota} credits.`,
          required: creditsCost,
          available: currentQuota
        });
      }

      const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
      const callbackUrl = `https://${host}/api/kie-callback`;
      const input = buildInputFromParameters(model, parameters);
      if (model.parameters?.optional?.callBackUrl || model.parameters?.required?.callBackUrl) {
        input.callBackUrl = callbackUrl;
      }

      console.log('Final input:', JSON.stringify(input, null, 2));

      const kieResponse = await fetch('https://api.kie.ai/v1/jobs/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.KIE_AI_KEY },
        body: JSON.stringify({ endpoint: model.endpoint, channel: model.channel || 'fal_request', input })
      });

      const kieResult = await kieResponse.json();
      if (!kieResult.success || !kieResult.data?.taskId) {
        console.error('KIE.AI error:', kieResult);
        return res.status(500).json({ success: false, error: kieResult.error || 'KIE.AI request failed' });
      }

      const taskId = kieResult.data.taskId;

  // === DYNAMIC MODEL MODE (NEW: 106+ models support) ===
  if (modelId && parameters) {
    try {
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const model = findModelById(modelId);
      if (!model) return res.status(404).json({ error: `Model not found: ${modelId}` });

      console.log('=== DYNAMIC MODEL GENERATION ===');
      console.log('userId:', userId);
      console.log('modelId:', modelId);
      console.log('model:', model.name);
      console.log('parameters:', JSON.stringify(parameters, null, 2));

      const db = getFirestore();
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

      const userData = userDoc.data();
      const currentQuota = userData.quotaRemaining || 0;
      const creditsCost = getModelCreditsCost(model);

      if (currentQuota < creditsCost) {
        return res.status(403).json({
          error: 'Insufficient credits',
          message: `This model requires ${creditsCost} credits. You have ${currentQuota} credits.`,
          required: creditsCost,
          available: currentQuota
        });
      }

      const host = req.headers.host || 'bananotoon-backend1-five.vercel.app';
      const callbackUrl = `https://${host}/api/kie-callback`;
      const input = buildInputFromParameters(model, parameters);
      if (model.parameters?.optional?.callBackUrl || model.parameters?.required?.callBackUrl) {
        input.callBackUrl = callbackUrl;
      }

      console.log('Final input:', JSON.stringify(input, null, 2));

      const kieResponse = await fetch('https://api.kie.ai/v1/jobs/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.KIE_AI_KEY },
        body: JSON.stringify({ endpoint: model.endpoint, channel: model.channel || 'fal_request', input })
      });

      const kieResult = await kieResponse.json();
      if (!kieResult.success || !kieResult.data?.taskId) {
        console.error('KIE.AI error:', kieResult);
        return res.status(500).json({ success: false, error: kieResult.error || 'KIE.AI request failed' });
      }

      const taskId = kieResult.data.taskId;
      await userRef.update({ quotaRemaining: admin.firestore.FieldValue.increment(-creditsCost) });

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
      console.error('❌ Dynamic model error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // Legacy mode not supported in this endpoint
  return res.status(400).json({ error: 'Use modelId + parameters for dynamic models' });
};
