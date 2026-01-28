/**
 * Vercel Endpoint - Multi-Model Comparison
 * Génère du contenu avec plusieurs modèles en parallèle pour comparaison
 * Endpoint: /api/generate-comparison
 *
 * Body parameters:
 * - userId: string (required)
 * - models: array of modelIds (required, 2-3 models)
 * - parameters: object (required) - Shared parameters for all models
 * - inputUrls: array of strings (optional)
 */
const { getFirestore, admin } = require('./_firebase');
const fs = require('fs');
const path = require('path');

// Load models catalog
function loadModelsCatalog() {
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

        return { models: allModels };
    } catch (error) {
        console.error('Error loading models catalog:', error);
        return null;
    }
}

// Find model by ID
function findModelById(modelId) {
    const catalog = loadModelsCatalog();
    if (!catalog || !catalog.models) return null;
    return catalog.models.find(model => model.id === modelId);
}

// Generate with single model (helper function)
async function generateWithModel(userId, modelId, parameters) {
    try {
        const model = findModelById(modelId);
        if (!model) {
            return {
                success: false,
                modelId: modelId,
                error: `Model not found: ${modelId}`
            };
        }

        // Build input
        const input = { ...parameters };
        if (model.parameters && model.parameters.optional) {
            Object.entries(model.parameters.optional).forEach(([key, param]) => {
                if (!input[key] && param.default !== undefined) {
                    input[key] = param.default;
                }
            });
        }

        // Build callback URL
        const callbackUrl = `https://${process.env.VERCEL_URL || 'bananotoon-backend1-five.vercel.app'}/api/kie-callback`;

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

        if (kieResult.code !== 200) {
            return {
                success: false,
                modelId: modelId,
                error: kieResult.msg || 'Unknown error'
            };
        }

        return {
            success: true,
            modelId: modelId,
            modelName: model.name,
            provider: model.provider,
            taskId: kieResult.data.taskId,
            creditsCost: model.pricing.standard?.credits_per_image ||
                         model.pricing.standard?.credits_per_second ||
                         model.pricing.standard?.credits_per_1000_chars || 10
        };
    } catch (error) {
        return {
            success: false,
            modelId: modelId,
            error: error.message
        };
    }
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
        const { userId, models, parameters, inputUrls } = req.body;

        // Validation
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        if (!models || !Array.isArray(models) || models.length < 2 || models.length > 3) {
            return res.status(400).json({ error: 'Please provide 2-3 model IDs' });
        }

        if (!parameters || typeof parameters !== 'object') {
            return res.status(400).json({ error: 'Missing or invalid parameters' });
        }

        console.log('=== MULTI-MODEL COMPARISON ===');
        console.log('userId:', userId);
        console.log('models:', models);
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

        // Calculate total cost
        let totalCost = 0;
        const modelDetails = [];

        for (const modelId of models) {
            const model = findModelById(modelId);
            if (!model) {
                return res.status(404).json({ error: `Model not found: ${modelId}` });
            }
            modelDetails.push(model);
            const cost = model.pricing.standard?.credits_per_image ||
                        model.pricing.standard?.credits_per_second ||
                        model.pricing.standard?.credits_per_1000_chars || 10;
            totalCost += cost;
        }

        console.log('Total cost:', totalCost);
        console.log('Current quota:', currentQuota);

        // Check if user has enough credits
        if (currentQuota < totalCost) {
            return res.status(403).json({
                error: 'Insufficient credits',
                message: `This comparison requires ${totalCost} credits. You have ${currentQuota} credits.`,
                required: totalCost,
                available: currentQuota
            });
        }

        // Launch all generations in parallel
        console.log('Launching parallel generations...');
        const promises = models.map(modelId => generateWithModel(userId, modelId, parameters));
        const results = await Promise.allSettled(promises);

        // Process results
        const comparisonResults = results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                return {
                    success: false,
                    modelId: models[index],
                    error: result.reason?.message || 'Unknown error'
                };
            }
        });

        // Deduct credits
        await userRef.update({
            quotaRemaining: admin.firestore.FieldValue.increment(-totalCost)
        });

        console.log(`✅ Credits deducted: -${totalCost}`);

        // Generate comparison ID
        const comparisonId = `comparison_${Date.now()}_${userId}`;

        // Save comparison to Firestore
        await db.collection('comparisons').doc(comparisonId).set({
            userId: userId,
            models: modelDetails.map(m => ({
                id: m.id,
                name: m.name,
                provider: m.provider
            })),
            parameters: parameters,
            inputUrls: inputUrls || [],
            totalCreditsUsed: totalCost,
            status: 'processing',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            results: comparisonResults.reduce((acc, result) => {
                acc[result.modelId] = {
                    success: result.success,
                    taskId: result.taskId || null,
                    error: result.error || null,
                    creditsCost: result.creditsCost || 0
                };
                return acc;
            }, {})
        });

        console.log(`✅ Comparison started - ID: ${comparisonId}`);

        return res.status(200).json({
            success: true,
            comparisonId: comparisonId,
            results: comparisonResults,
            totalCreditsUsed: totalCost,
            message: `Comparison started with ${models.length} models!`
        });

    } catch (error) {
        console.error('❌ Error in generate-comparison:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
