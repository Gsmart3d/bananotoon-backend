# KIE.AI API Endpoints Mapping - Documentation

Ce dossier contient une **analyse complète et structurée de tous les endpoints de l'API KIE.AI**, extraite de 155 fichiers HTML de documentation.

## 📁 Fichiers Générés

### 1. `api-endpoints-mapping.json` (245KB)
**Le fichier principal** contenant toutes les données structurées :

```json
{
  "metadata": {
    "total_count": 155,
    "by_category_count": {...},
    "by_capability_count": {...},
    "all_model_ids": [...]
  },
  "endpoints": [...],
  "by_category": {...},
  "by_capability": {...}
}
```

**Structure d'un endpoint:**
```json
{
  "name": "Generate 4o Image",
  "endpoint": "/api/v1/gpt4o-image/generate",
  "method": "POST",
  "modelIds": ["gpt-4o-image"],
  "required": {
    "prompt": "str",
    "size": "str"
  },
  "optional": {
    "callBackUrl": "str",
    "isEnhance": "bool"
  },
  "pricing": {
    "credits": 10
  },
  "examples": ["curl ..."],
  "category": "4o-image",
  "capability": "text-to-image",
  "source_file": "4oimage/Generate 4o Image.html"
}
```

### 2. `API_ENDPOINTS_SUMMARY.md`
Documentation Markdown **lisible et organisée** avec :
- Vue d'ensemble des catégories
- Liste complète des modèles
- Endpoints clés par service
- Guide de référence rapide

### 3. `search_endpoints.py`
**Outil en ligne de commande** pour rechercher dans le mapping :

```bash
# Lister toutes les catégories
python3 search_endpoints.py list-categories

# Lister toutes les capacités
python3 search_endpoints.py list-capabilities

# Lister tous les model IDs
python3 search_endpoints.py list-models

# Chercher par model ID
python3 search_endpoints.py model wan/2-6

# Chercher par capacité
python3 search_endpoints.py capability text-to-video

# Chercher par catégorie
python3 search_endpoints.py category suno

# Chercher par nom
python3 search_endpoints.py name "Music"
```

## 🎯 Utilisation Pratique

### Exemple 1: Trouver tous les modèles de génération vidéo text-to-video

```bash
python3 search_endpoints.py capability text-to-video
```

**Résultat:** 12 endpoints incluant Wan 2.6, Kling 2.6, Sora2, Bytedance, etc.

### Exemple 2: Voir tous les endpoints Suno pour la musique

```bash
python3 search_endpoints.py category suno
```

**Résultat:** 35 endpoints couvrant génération, extension, édition, conversion, etc.

### Exemple 3: Trouver quel endpoint utiliser pour un model_id spécifique

```bash
python3 search_endpoints.py model kling/v2-1-pro
```

### Exemple 4: Utilisation programmatique en Python

```python
import json

# Charger le mapping
with open('api-endpoints-mapping.json', 'r') as f:
    data = json.load(f)

# Trouver tous les endpoints de vidéo
video_endpoints = []
for ep in data['endpoints']:
    if 'video' in ep['category']:
        video_endpoints.append(ep)

# Obtenir tous les modèles disponibles
all_models = data['metadata']['all_model_ids']

# Filtrer par catégorie
suno_endpoints = data['by_category']['suno']
wan_endpoints = data['by_category']['market-video-wan']

# Filtrer par capacité
text_to_image = data['by_capability']['text-to-image']
```

## 📊 Statistiques Clés

- **155 endpoints** documentés
- **31 catégories** (4o-image, suno, runway, veo, luma, flux, market-*)
- **79 model IDs uniques**
- **27 capacités** (text-to-image, image-to-video, generate-music, etc.)

### Distribution par Type

| Type | Catégories | Endpoints |
|------|------------|-----------|
| **Core APIs** | 7 | 58 |
| **Market Image** | 9 | 33 |
| **Market Video** | 8 | 44 |
| **Market Chat/Audio** | 3 | 11 |
| **Utility** | 4 | 9 |

## 🔧 Scripts de Génération

### `parse_html_docs_v2.py`
Parse tous les fichiers HTML de `docskie/` et extrait :
- URLs d'endpoint
- Méthodes HTTP
- Model IDs
- Paramètres requis/optionnels
- Exemples de curl
- Pricing (si disponible)

### `enhance_api_mapping_v2.py`
Enrichit le mapping avec :
- Catégorisation intelligente
- Détection de capacités
- Regroupements par catégorie et capacité
- Métadonnées aggregées

### `fix_source_paths.py`
Corrige les chemins relatifs des fichiers sources.

## 📝 Catégories Disponibles

### Core APIs
- `4o-image` - GPT-4o Image Generation
- `runway` - Runway Video Generation
- `runway-aleph` - Runway Aleph Models
- `suno` - Suno Music/Audio (35 endpoints!)
- `veo` - Google Veo Video
- `flux` - Flux Image Generation
- `luma` - Luma Video Modification

### Market APIs
#### Images
- `market-image-google` (imagen4, nano-banana)
- `market-image-gpt` (GPT Image 1.5)
- `market-image-grok` (Grok Imagine)
- `market-image-ideogram` (Ideogram character)
- `market-image-qwen` (Qwen)
- `market-image-recraft` (Recraft)
- `market-image-seedream` (Bytedance Seedream)
- `market-image-topaz` (Topaz Upscale)
- `market-image-zimage` (Z-Image)

#### Videos
- `market-video-wan` (Wan 2.2, 2.6)
- `market-video-kling` (Kling v2.1, v2.5, v2.6)
- `market-video-sora` (Sora2, Sora2 Pro)
- `market-video-bytedance` (Bytedance v1)
- `market-video-hailuo` (Hailuo)
- `market-video-grok` (Grok Video)
- `market-video-infinitalk` (Infinitalk)
- `market-video-topaz` (Topaz Video Upscale)

#### Chat & Audio
- `market-chat-claude` (Claude Opus 4.5, Sonnet 4.5)
- `market-chat-gemini` (Gemini 2.5, 3)
- `market-music-elevenlabs` (ElevenLabs TTS/STT)

### Utility
- `common` - Crédits, téléchargements, webhooks
- `file-upload` - Upload de fichiers
- `documentation` - Guides
- `market-general` - API Marketplace générale

## 🎨 Capacités Principales

| Capacité | Count | Description |
|----------|-------|-------------|
| `text-to-image` | 8 | Génération d'images depuis texte |
| `image-to-image` | 5 | Transformation d'images |
| `text-to-video` | 12 | Génération de vidéos depuis texte |
| `image-to-video` | 15 | Conversion image → vidéo |
| `video-to-video` | 1 | Transformation de vidéos |
| `generate-music` | 3 | Génération musicale |
| `text-to-speech` | 2 | Synthèse vocale |
| `speech-to-text` | 1 | Transcription |
| `audio-separation` | 4 | Séparation vocale/instrumentale |
| `upscale` | 4 | Upscaling image/vidéo |
| `edit` | 11 | Édition |
| `extend` | 4 | Extension vidéo/musique |

## 🚀 Intégration dans le Backend Vercel

### Routing Intelligent

```typescript
// Exemple: Router automatique basé sur model_id
import apiMapping from './api-endpoints-mapping.json';

function routeToEndpoint(modelId: string) {
  const endpoint = apiMapping.endpoints.find(ep =>
    ep.modelIds.includes(modelId)
  );

  if (!endpoint) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  return {
    url: `https://api.kie.ai${endpoint.endpoint}`,
    method: endpoint.method,
    category: endpoint.category,
    capability: endpoint.capability
  };
}

// Usage
const route = routeToEndpoint('wan/2-6-text-to-video');
// → { url: 'https://api.kie.ai/api/v1/jobs/createTask', ... }
```

### Validation des Paramètres

```typescript
function validateParams(modelId: string, params: any) {
  const endpoint = findEndpointByModel(modelId);

  // Vérifier paramètres requis
  for (const [key, type] of Object.entries(endpoint.required)) {
    if (!(key in params)) {
      throw new Error(`Missing required parameter: ${key}`);
    }
  }

  return true;
}
```

## 🔍 Recherche Avancée

### Trouver tous les modèles avec une capacité spécifique

```python
import json

with open('api-endpoints-mapping.json', 'r') as f:
    data = json.load(f)

# Tous les modèles text-to-image
t2i_models = []
for ep in data['by_capability']['text-to-image']:
    t2i_models.extend(ep['modelIds'])

print(f"Models text-to-image: {set(t2i_models)}")
```

### Grouper par provider

```python
from collections import defaultdict

providers = defaultdict(list)
for model in data['metadata']['all_model_ids']:
    if '/' in model:
        provider = model.split('/')[0]
        providers[provider].append(model)

# Afficher tous les modèles Kling
print(f"Kling models: {providers['kling']}")
```

## 📞 Support

Pour toute question sur ce mapping:
1. Consulter `API_ENDPOINTS_SUMMARY.md`
2. Utiliser `search_endpoints.py` pour des recherches
3. Inspecter `api-endpoints-mapping.json` pour les détails complets

## 🔄 Mise à Jour

Pour régénérer le mapping après mise à jour de la documentation:

```bash
# 1. Parser les HTML
python3 parse_html_docs_v2.py

# 2. Enrichir avec catégories/capacités
python3 enhance_api_mapping_v2.py

# 3. Tester
python3 search_endpoints.py list-categories
```

---

**Généré le:** 2026-01-29
**Source:** 155 fichiers HTML de documentation KIE.AI
**Format:** JSON structuré + Markdown + Python CLI
