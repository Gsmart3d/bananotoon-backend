# KIE API Endpoints Mapping

## 📋 Vue d'ensemble

Ce document décrit le mapping complet de tous les endpoints de l'API KIE extraits automatiquement depuis la documentation HTML officielle.

**Fichier de mapping**: `api-endpoints-mapping.json`

### Statistiques

- **Total d'endpoints**: 146
- **Catégories**:
  - 🖼️ Image: 38 endpoints
  - 🎬 Video: 58 endpoints
  - 🎵 Audio: 35 endpoints
  - 💬 Chat: 5 endpoints
  - 🔧 Other: 10 endpoints

### Paramètres les plus courants

| Paramètre | Nombre d'endpoints |
|-----------|-------------------|
| `model` | 81 |
| `input` | 74 |
| `aspect_ratio` | 26 |
| `resolution` | 22 |
| `duration` | 22 |
| `image_url` | 21 |
| `prompt` | 20 |
| `negative_prompt` | 14 |
| `taskId` | 12 |

## 📁 Structure du fichier JSON

```json
{
  "version": "2.0.0",
  "extracted_date": "2026-01-29 14:11:37",
  "description": "Complete mapping of KIE API endpoints",
  "total_endpoints": 146,
  "categories": {...},
  "most_common_parameters": {...},
  "endpoints": [
    {
      "name": "Nom de l'endpoint",
      "category": "image|video|audio|chat|other",
      "endpoint": "/api/v1/...",
      "full_url": "https://api.kie.ai/api/v1/...",
      "method": "POST|GET",
      "modelIds": ["model-id-1", "model-id-2"],
      "parameters": {
        "required": {
          "param_name": {
            "type": "string|number|boolean|array|object",
            "example": "valeur exemple",
            "description": "Description du paramètre"
          }
        },
        "optional": {...}
      },
      "pricing": {
        "credits": 50
      }
    }
  ]
}
```

## 🚀 Utilisation

### Exemple: Générer une vidéo avec Wan 2.6

```javascript
// Charger le mapping
const mapping = require('./api-endpoints-mapping.json');

// Trouver l'endpoint Wan 2.6
const wanEndpoint = mapping.endpoints.find(
  ep => ep.name.includes('Wan 2.6 - Image to Video')
);

// Préparer la requête
const request = {
  model: wanEndpoint.modelIds[0], // "wan/2-6-image-to-video"
  input: {
    image_url: "https://example.com/image.jpg"
  },
  duration: 5,
  resolution: "1080p"
};

// Appeler l'API
const response = await fetch(wanEndpoint.full_url, {
  method: wanEndpoint.method,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(request)
});
```

### Exemple: Recherche dynamique d'endpoints

```javascript
const mapping = require('./api-endpoints-mapping.json');

// Trouver tous les endpoints vidéo
const videoEndpoints = mapping.endpoints.filter(
  ep => ep.category === 'video'
);

// Trouver les endpoints qui supportent un modèle spécifique
const klingEndpoints = mapping.endpoints.filter(
  ep => ep.modelIds.some(model => model.includes('kling'))
);

// Trouver les endpoints avec un paramètre spécifique
const promptEndpoints = mapping.endpoints.filter(
  ep => ep.parameters.required.prompt || ep.parameters.optional.prompt
);
```

## 📊 Endpoints par catégorie

### 🖼️ Image Generation (38 endpoints)

Principaux fournisseurs:
- **Google Imagen** (imagen4, imagen4-fast, imagen4-ultra, Nano Banana)
- **Flux-2** (Text to Image, Image to Image, Pro versions)
- **Seedream** (3.0, 4.0, 4.5)
- **Ideogram** (character, character-edit, character-remix, v3-reframe)
- **Grok Imagine** (Text to Image, Image to Image, Upscale)
- **Qwen** (Text to Image, Image to Image, Edit)
- **Recraft** (Upscale, Remove Background)
- **GPT Image 1.5** (Text to Image, Image to Image)
- **Topaz** (Image Upscale)
- **z-image**

### 🎬 Video Generation (58 endpoints)

Principaux fournisseurs:
- **Wan** (2.6, 2.2, Animate Move, Animate Replace)
- **Kling** (2.6, 2.5 Turbo, 2.1 Pro/Standard/Master, AI Avatar)
- **Sora2** (Pro, Characters, Storyboard, Watermark Remover)
- **Bytedance** (V1 Pro/Lite, Seedance 1.5 Pro)
- **Hailuo** (Pro, Standard)
- **Grok Imagine** (Text to Video, Image to Video)
- **Runway/Aleph** (Generate, Extend)
- **Veo 3.1** (Fast & Quality, Extend, 1080P, 4K)
- **Luma** (Modify Video)
- **Infinitalk** (From Audio)
- **Topaz** (Video Upscale)

### 🎵 Audio/Music Generation (35 endpoints)

Principaux fournisseurs:
- **Suno** (Generate Music, Extend, Add Vocals, Add Instrumental, Lyrics, Cover, MIDI, Music Video, WAV Conversion)
- **ElevenLabs** (Text to Speech, Speech to Text, Sound Effects, Dialogue, Audio Isolation)

### 💬 Chat Models (5 endpoints)

- **Claude** (Sonnet 4.5, Opus 4.5)
- **Gemini** (2.5 Flash, 2.5 Pro, 3 Pro)

## 🔑 Endpoint principal: `/api/v1/jobs/createTask`

La majorité des endpoints utilisent `/api/v1/jobs/createTask` avec un paramètre `model` pour spécifier le modèle à utiliser.

### Structure de requête type:

```json
{
  "model": "provider/model-name",
  "input": {
    "prompt": "Your prompt here",
    "image_url": "https://...",
    "aspect_ratio": "16:9",
    "resolution": "1080p",
    "duration": 5
  },
  "webhook_url": "https://your-webhook.com/callback"
}
```

## 📝 Notes importantes

### Endpoints spécifiques

Certains services ont des endpoints dédiés au lieu d'utiliser `/jobs/createTask`:

- **Suno**: `/api/v1/generate/*` et `/api/v1/suno/*`
- **Aleph/Runway**: `/api/v1/aleph/*` et `/api/v1/runway/*`
- **Flux Kontext**: `/api/v1/flux/*`
- **Veo 3.1**: `/api/v1/veo/*`
- **4o Image**: `/api/v1/gpt4o-image/*`

### Paramètres communs

| Paramètre | Type | Description |
|-----------|------|-------------|
| `model` | string | ID du modèle à utiliser (ex: "wan/2-6-image-to-video") |
| `input` | object | Objet contenant les paramètres d'entrée |
| `prompt` | string | Description textuelle de ce que vous voulez générer |
| `image_url` | string | URL de l'image d'entrée |
| `video_url` | string | URL de la vidéo d'entrée |
| `audio_url` | string | URL de l'audio d'entrée |
| `aspect_ratio` | string | Ratio d'aspect (ex: "16:9", "9:16", "1:1") |
| `resolution` | string | Résolution (ex: "720p", "1080p", "4k") |
| `duration` | number | Durée en secondes |
| `quality` | string | Qualité (ex: "standard", "hd", "ultra") |
| `seed` | number | Seed pour la reproductibilité |
| `webhook_url` | string | URL de callback pour résultat asynchrone |

### Pricing

Le coût en crédits varie selon le modèle:
- Image generation: généralement 1-10 crédits
- Video generation: généralement 10-100 crédits
- Audio generation: généralement 5-50 crédits

**Note**: Seulement 1 endpoint a été trouvé avec le pricing explicite dans la documentation. Référez-vous à la documentation officielle pour les coûts actuels.

## 🔄 Workflow typique

1. **Créer une tâche**: POST vers `/api/v1/jobs/createTask` avec les paramètres
2. **Récupérer le taskId** de la réponse
3. **Polling ou Webhook**:
   - Polling: GET `/api/v1/jobs/taskDetails?taskId={taskId}`
   - Webhook: Recevoir la notification sur votre `webhook_url`
4. **Télécharger le résultat**: Utiliser l'URL fournie dans la réponse

## 📚 Documentation officielle

Pour plus de détails, consultez:
- Documentation officielle: https://docs.kie.ai
- Fichiers HTML locaux: `./docskie/`

## 🛠️ Maintenance

Ce fichier a été généré automatiquement le 2026-01-29 en analysant 155 fichiers HTML de documentation.

Pour régénérer le mapping:
```bash
python3 extract_real_params.py
```

## ⚠️ Limitations

- Certains paramètres peuvent manquer de description car non documentés dans les HTML
- Les exemples sont extraits directement de la documentation
- Les paramètres "required" vs "optional" sont déduits automatiquement
- Le pricing n'est pas disponible pour tous les endpoints

## 🆘 Support

Pour toute question sur l'utilisation des APIs, référez-vous à:
1. Ce fichier de mapping
2. Les fichiers HTML originaux dans `./docskie/`
3. La documentation officielle KIE API
