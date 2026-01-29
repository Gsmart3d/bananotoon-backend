# KIE.AI API Endpoints - Complete Mapping

**Generated:** 2026-01-29
**Total Endpoints:** 155
**Unique Models:** 79

---

## 📊 Categories Overview

### Core APIs

| Category | Count | Description |
|----------|-------|-------------|
| **4o-image** | 4 | GPT-4o Image Generation API |
| **runway** | 5 | Runway AI Video Generation |
| **runway-aleph** | 3 | Runway Aleph Video Generation |
| **suno** | 35 | Suno Music/Audio Generation |
| **veo** | 7 | Google Veo Video Generation |
| **flux** | 7 | Flux Image Generation/Editing |
| **luma** | 3 | Luma Video Modification |

### Market Image Models

| Category | Count | Models |
|----------|-------|--------|
| **market-image-google** | 6 | imagen4, imagen4-fast, imagen4-ultra, nano-banana |
| **market-image-gpt** | 2 | gpt-image/1.5 |
| **market-image-grok** | 3 | grok-imagine (text-to-image, image-to-image, upscale) |
| **market-image-ideogram** | 4 | ideogram/character variants |
| **market-image-qwen** | 3 | qwen (text-to-image, image-to-image, edit) |
| **market-image-recraft** | 2 | recraft/upscale, remove-background |
| **market-image-seedream** | 5 | bytedance/seedream v3.0, v4.0, v4.5 |
| **market-image-topaz** | 1 | topaz/image-upscale |
| **market-image-zimage** | 1 | z-image |

### Market Video Models

| Category | Count | Models |
|----------|-------|--------|
| **market-video-wan** | 8 | wan/2-2, wan/2-6 (text/image/video-to-video) |
| **market-video-kling** | 11 | kling v2.1, v2.5, v2.6 variants |
| **market-video-sora** | 7 | sora-2, sora-2-pro variants |
| **market-video-bytedance** | 6 | bytedance v1 (lite/pro/fast) + seedance |
| **market-video-hailuo** | 6 | hailuo/02 (standard/pro) |
| **market-video-grok** | 2 | grok-imagine (text/image-to-video) |
| **market-video-infinitalk** | 1 | infinitalk/from-audio |
| **market-video-topaz** | 1 | topaz/video-upscale |

### Market Chat & Audio Models

| Category | Count | Models |
|----------|-------|--------|
| **market-chat-claude** | 2 | claude-opus-4-5, claude-sonnet-4-5 |
| **market-chat-gemini** | 3 | gemini-2.5-flash, gemini-2.5-pro, gemini-3-pro |
| **market-music-elevenlabs** | 6 | text-to-speech, audio-isolation, sound-effects |

### Utility APIs

| Category | Count | Description |
|----------|-------|-------------|
| **common** | 4 | Credits, download URLs, webhooks |
| **file-upload** | 4 | Base64, URL, stream uploads |
| **documentation** | 1 | Getting started guide |
| **market-general** | 2 | General marketplace endpoints |

---

## 🎯 Capabilities Breakdown

| Capability | Count | Use Case |
|------------|-------|----------|
| **get-status** | 33 | Check task/generation status |
| **image-to-video** | 15 | Convert images to videos |
| **text-to-video** | 12 | Generate videos from text |
| **edit** | 11 | Image/video/audio editing |
| **text-to-image** | 8 | Generate images from text |
| **image-to-image** | 5 | Image transformations |
| **audio-separation** | 4 | Vocal/instrumental separation |
| **cover** | 4 | Music cover generation |
| **extend** | 4 | Extend videos/music |
| **upscale** | 4 | Image/video upscaling |
| **generate-music** | 3 | Music generation |
| **character-generation** | 3 | Character image creation |
| **audio-to-midi** | 3 | Convert audio to MIDI |
| **audio-convert** | 3 | Audio format conversion |
| **motion-control** | 3 | Video motion control |
| **text-to-speech** | 2 | TTS generation |
| **audio-effect** | 2 | Sound effects |
| **get-download** | 2 | Download generated files |
| **get-credits** | 1 | Check remaining credits |
| **generate-lyrics** | 1 | AI lyrics generation |
| **speech-to-text** | 1 | STT transcription |
| **text-to-dialogue** | 1 | Multi-voice dialogue |
| **video-to-video** | 1 | Video transformations |
| **reframe** | 1 | Image reframing |
| **remove-background** | 1 | Background removal |
| **remove-watermark** | 1 | Watermark removal |

---

## 🔑 Key Endpoints

### 4o Image API
```
POST /api/v1/gpt4o-image/generate
POST /api/v1/gpt4o-image/record-info
POST /api/v1/gpt4o-image/download-url
```

### Runway Video API
```
POST /api/v1/runway/generate
POST /api/v1/runway/extend
POST /api/v1/runway/record-info
POST /api/v1/aleph/generate
POST /api/v1/aleph/record-info
```

### Suno Music API
```
POST /api/v1/suno/generate
POST /api/v1/generate/extend
POST /api/v1/generate/add-vocals
POST /api/v1/generate/add-instrumental
POST /api/v1/suno/record-info
POST /api/v1/generate/cover
POST /api/v1/generate/midi
POST /api/v1/generate/separation
POST /api/v1/generate/video
```

### Veo Video API
```
POST /api/v1/veo/generate
POST /api/v1/veo/extend
POST /api/v1/veo/record-info
POST /api/v1/veo/get-1080p-video
POST /api/v1/veo/get-4k-video
```

### Flux Image API
```
POST /api/v1/flux/kontext/generate
POST /api/v1/flux/kontext/record-info
```

### Luma Video API
```
POST /api/v1/modify/generate
POST /api/v1/modify/record-info
```

### Market API (Unified)
```
POST /api/v1/jobs/createTask      # Create task for any model
POST /api/v1/jobs/recordInfo      # Get task status
```

### Common APIs
```
POST /api/v1/chat/credit          # Get remaining credits
POST /api/v1/common/download-url  # Get download URL
POST /api/v1/file/upload          # Upload files
```

---

## 🏷️ Complete Model IDs List

### Image Models (31 models)
- **Flux**: flux-2/pro-text-to-image, flux-2/flex-text-to-image, flux-2/pro-image-to-image, flux-2/flex-image-to-image, flux-kontext-pro
- **Google**: google/imagen4, google/imagen4-fast, google/imagen4-ultra, google/nano-banana, google/nano-banana-edit, nano-banana-pro
- **GPT Image**: gpt-image/1.5-text-to-image, gpt-image/1.5-image-to-image
- **Grok**: grok-imagine/text-to-image, grok-imagine/image-to-image, grok-imagine/upscale
- **Ideogram**: ideogram/character, ideogram/character-edit, ideogram/character-remix
- **Qwen**: qwen/text-to-image, qwen/image-edit
- **Recraft**: recraft/crisp-upscale, recraft/remove-background
- **Seedream**: bytedance/seedream, bytedance/seedream-v4-text-to-image, bytedance/seedream-v4-edit, seedream/4.5-text-to-image, seedream/4.5-edit
- **Others**: topaz/image-upscale, z-image

### Video Models (36 models)
- **Wan**: wan/2-2-a14b-text-to-video-turbo, wan/2-2-a14b-image-to-video-turbo, wan/2-2-a14b-speech-to-video-turbo, wan/2-2-animate-move, wan/2-2-animate-replace, wan/2-6-text-to-video, wan/2-6-image-to-video, wan/2-6-video-to-video
- **Kling**: kling/v2-1-standard, kling/v2-1-pro, kling/v2-1-master-text-to-video, kling/v2-1-master-image-to-video, kling/v2-5-turbo-text-to-video-pro, kling/v2-5-turbo-image-to-video-pro, kling/ai-avatar-standard, kling/ai-avatar-pro, kling-2.6/image-to-video, kling-2.6/motion-control
- **Sora**: sora-2-text-to-video, sora-2-image-to-video, sora-2-pro-text-to-video, sora-2-pro-image-to-video, sora-2-pro-storyboard, sora-2-characters, sora-watermark-remover
- **Bytedance**: bytedance/v1-lite-text-to-video, bytedance/v1-lite-image-to-video, bytedance/v1-pro-text-to-video, bytedance/v1-pro-image-to-video, bytedance/v1-pro-fast-image-to-video, bytedance/seedance-1.5-pro
- **Hailuo**: hailuo/02-text-to-video-standard, hailuo/02-image-to-video-standard, hailuo/02-image-to-video-pro, hailuo/2-3-image-to-video-pro
- **Grok**: grok-imagine/text-to-video, grok-imagine/image-to-video
- **Runway**: runway-duration-5-generate
- **Others**: infinitalk/from-audio, topaz/video-upscale

### Audio Models (8 models)
- **ElevenLabs**: elevenlabs/text-to-speech-turbo-2-5, elevenlabs/text-to-speech-multilingual-v2, elevenlabs/text-to-dialogue-v3, elevenlabs/speech-to-text, elevenlabs/sound-effect-v2, elevenlabs/audio-isolation
- **Suno**: V4, V4_5PLUS (internal Suno model IDs)

---

## 📝 Notes

1. **Market API Pattern**: Most market models use the unified endpoint `/api/v1/jobs/createTask` with different `model_id` parameters
2. **Callback Support**: Many endpoints support optional `callBackUrl` parameter for async notifications
3. **Status Checking**: All generation APIs have corresponding `record-info` or similar endpoints for status polling
4. **File Upload**: Files can be uploaded via Base64, URL, or stream before being used in generation requests
5. **Credits**: Each API call consumes credits based on the model and parameters used

---

## 🔗 Related Files

- **Full JSON Mapping**: `api-endpoints-mapping.json` (245KB)
- **Parser Scripts**: `parse_html_docs_v2.py`, `enhance_api_mapping_v2.py`
- **Documentation Source**: `docskie/` folder (155 HTML files)
