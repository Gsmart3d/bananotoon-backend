/**
 * HARDCODED MODEL CONFIGURATIONS
 * Paramètres exacts qui MARCHENT pour chaque modèle
 * Basé sur la doc KIE.AI + tests réels
 */

module.exports = {
  // ========== IMAGE MODELS (PAS CHERS) ==========

  'google/nano-banana': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'google/nano-banana',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      }
    }),
    credits: 10
  },

  'google/imagen4-fast': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'google/imagen4-fast',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      }
    }),
    credits: 10
  },

  'google/imagen4': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'google/imagen4',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      }
    }),
    credits: 12
  },

  'google/imagen4-ultra': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'google/imagen4-ultra',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      }
    }),
    credits: 15
  },

  'grok-imagine-text-to-image': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'grok-imagine-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      }
    }),
    credits: 10
  },

  'gpt-image/1.5-text-to-image': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'gpt-image/1.5-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      },
      aspect_ratio: params.aspect_ratio || '1:1',
      quality: params.quality || 'medium'
    }),
    credits: 12
  },

  'flux-2/pro-text-to-image': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'flux-2/pro-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      },
      aspect_ratio: params.aspect_ratio || '1:1',
      resolution: params.resolution || '2K'
    }),
    credits: 18
  },

  'flux-2/flex-text-to-image': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'flux-2/flex-text-to-image',
      callBackUrl: callbackUrl,
      input: {
        prompt: params.prompt || 'a beautiful image'
      },
      aspect_ratio: params.aspect_ratio || '1:1',
      resolution: params.resolution || '1K'
    }),
    credits: 12
  },

  // ========== VIDEO MODELS ==========

  'wan/2-6-image-to-video': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'wan/2-6-image-to-video',
      callBackUrl: callbackUrl,
      input: {
        image_url: params.image_url,
        prompt: params.prompt || 'smooth cinematic motion'
      },
      duration: params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9',
      resolution: params.resolution || '720p'
    }),
    credits: 25
  },

  'wan/2-2-a14b-image-to-video-turbo': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'wan/2-2-a14b-image-to-video-turbo',
      callBackUrl: callbackUrl,
      input: {
        image_url: params.image_url,
        prompt: params.prompt || 'smooth motion'
      },
      duration: params.duration || 5,
      aspect_ratio: params.aspect_ratio || '16:9',
      resolution: params.resolution || '720p'
    }),
    credits: 25
  },

  'kling/2-6-pro-image-to-video': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'kling/2-6-pro-image-to-video',
      callBackUrl: callbackUrl,
      input: {
        image_url: params.image_url,
        prompt: params.prompt || 'cinematic motion'
      },
      duration: params.duration || 5,
      quality: params.quality || 'standard'
    }),
    credits: 30
  },

  // ========== AUDIO MODELS ==========

  'elevenlabs-sound-effect-v2': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'elevenlabs-sound-effect-v2',
      callBackUrl: callbackUrl,
      input: {
        text: params.text || params.prompt || 'a sound effect',
        duration_seconds: params.duration_seconds || 5
      }
    }),
    credits: 10
  },

  'elevenlabs-tts-v2': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'elevenlabs-tts-v2',
      callBackUrl: callbackUrl,
      input: {
        text: params.text || params.prompt || 'Hello world',
        voice: params.voice || 'default'
      }
    }),
    credits: 8
  },

  'suno-v5': {
    endpoint: '/api/v1/suno/generate',
    buildRequest: (params, callbackUrl) => ({
      prompt: params.prompt || 'a catchy pop song',
      make_instrumental: params.make_instrumental || false,
      wait_audio: true,
      callBackUrl: callbackUrl
    }),
    credits: 35
  },

  // ========== CHAT MODELS ==========

  'claude-opus-4.5': {
    endpoint: '/api/v1/jobs/createTask',
    buildRequest: (params, callbackUrl) => ({
      model: 'claude-opus-4.5',
      input: {
        messages: params.messages || [{ role: 'user', content: params.prompt || 'Hello' }]
      }
    }),
    credits: 5
  }
};
