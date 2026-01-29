/**
 * Vercel Endpoint - Check Transformation Status
 * Calls KIE.AI API directly to check task status
 * Endpoint: /api/check-transformation
 */

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const taskId = req.method === 'GET' ? req.query.taskId : req.body.taskId;

  if (!taskId) {
    return res.status(400).json({ error: 'Missing taskId' });
  }

  try {
    console.log(`🔍 Checking status for taskId: ${taskId}`);

    // Call KIE.AI API directly
    const kieResponse = await fetch(`https://api.kie.ai/api/v1/jobs/get-result/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const kieData = await kieResponse.json();
    console.log(`📊 KIE.AI response:`, kieData);

    // Map KIE.AI response to our format
    if (kieData.code === 200 && kieData.data) {
      const data = kieData.data;
      const state = data.state || data.status;

      // Map status
      let status = 'pending';
      if (state === 'success' || state === 'completed') {
        status = 'completed';
      } else if (state === 'failed' || state === 'error') {
        status = 'failed';
      } else if (state === 'processing' || state === 'running') {
        status = 'processing';
      }

      // Extract result URL
      let resultUrl = null;
      if (data.resultJson) {
        try {
          const resultData = typeof data.resultJson === 'string'
            ? JSON.parse(data.resultJson)
            : data.resultJson;

          // Try different possible fields
          resultUrl = resultData.resultUrls?.[0]
            || resultData.resultUrl
            || resultData.imageUrl
            || resultData.videoUrl
            || resultData.audioUrl
            || resultData.image_url
            || resultData.video_url
            || resultData.audio_url;
        } catch (e) {
          console.error('Failed to parse resultJson:', e);
        }
      }

      return res.status(200).json({
        success: true,
        taskId: taskId,
        status: status,
        imageUrl: resultUrl,
        videoUrl: resultUrl,
        audioUrl: resultUrl,
        message: data.failMsg || data.errorMessage || null
      });
    }

    // If task not found or error
    return res.status(200).json({
      success: true,
      taskId: taskId,
      status: 'pending',
      imageUrl: null,
      message: kieData.msg || 'Task still processing'
    });

  } catch (error) {
    console.error('❌ Error checking transformation:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
