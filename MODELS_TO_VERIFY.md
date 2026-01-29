# VÉRIFICATION DES NOMS DE MODÈLES KIE.AI

## ✅ MODÈLES DÉJÀ TESTÉS ET FONCTIONNELS (ne pas toucher):

| ID | Nom actuel | Statut |
|---|---|---|
| flux-2-pro-text-to-image | `flux-2/pro-text-to-image` | ✅ Fonctionne |
| flux-2-flex-text-to-image | `flux-2/flex-text-to-image` | ✅ Fonctionne |
| google-nano-banana | `google/nano-banana` | ✅ Fonctionne |
| google-nano-banana-edit | `google/nano-banana-edit` | ✅ Fonctionne |
| gpt-image-1.5-text-to-image | `gpt-image/1.5-text-to-image` | ✅ Fonctionne |
| google-imagen4-fast | `google/imagen4-fast` | ✅ Fonctionne |
| grok-imagine-text-to-image | `grok-imagine/text-to-image` | ✅ Fonctionne |
| elevenlabs-text-to-speech-turbo-2-5 | `elevenlabs/text-to-speech-turbo-2.5` | ✅ Fonctionne |
| elevenlabs-sound-effect-v2 | `elevenlabs/sound-effect-v2` | ✅ Fonctionne |
| kling-avatar | (vrai nom dans catalog) | ✅ Fonctionne |

---

## ❌ MODÈLES À VÉRIFIER (écris le vrai nom KIE.AI):

### IMAGE MODELS (image-models.json)

| ID | Nom actuel | Vrai nom KIE.AI | Fichier:Ligne |
|---|---|---|---|
| 4o-image | (PAS DE MODEL NAME!) | ______________ | image-models.json:6 |
| flux-kontext-pro | `flux-kontext-pro` | ______________ | image-models.json:118 |
| nano-banana-pro | `nano-banana-pro` | ______________ | image-models.json:1086 |

### AUDIO/MUSIC MODELS (audio-models.json)

| ID | Nom actuel | Vrai nom KIE.AI | Fichier:Ligne |
|---|---|---|---|
| suno-generate-music | Options: V4, V4_5, V4_5PLUS, V4_5ALL, V5 | ______________ | audio-models.json:360 |
| suno-generate-lyrics | Options: V4, V4_5, V4_5PLUS, V4_5ALL, V5 | ______________ | audio-models.json:424 |
| suno-add-vocals | `V4_5PLUS` | ______________ | audio-models.json:480 |
| suno-add-instrumental | `V4_5PLUS` | ______________ | audio-models.json:527 |
| suno-extend-music | Options: V4, V4_5, V4_5PLUS, V4_5ALL, V5 | ______________ | audio-models.json:570 |

### CHAT MODELS (chat-models.json)

| ID | Nom actuel | Vrai nom KIE.AI | Notes |
|---|---|---|---|
| claude-opus-4-5 | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |
| claude-sonnet-4-5 | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |
| gemini-2.5-flash | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |
| gemini-2.5-pro | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |
| gpt-4o | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |
| gpt-4o-mini | (format "messages" complexe) | ______________ | À vérifier si KIE.AI supporte |

---

## 📝 INSTRUCTIONS POUR CORRIGER:

1. **Vérifie sur KIE.AI Dashboard** le vrai nom de chaque modèle
2. **Écris le vrai nom** dans la colonne "Vrai nom KIE.AI"
3. **Une fois tous vérifiés**, dis-moi et je vais corriger tous les fichiers JSON automatiquement

### Format attendu:
- Avec slash: `provider/model-name` (ex: `flux/kontext-pro`)
- Ou direct: `model-name` (ex: `V5` devient `suno/v5` ?)

### Exemples qui fonctionnent:
- ✅ `flux-2/pro-text-to-image`
- ✅ `google/nano-banana`
- ✅ `elevenlabs/text-to-speech-turbo-2.5`
- ✅ `grok-imagine/text-to-image`

### Fichiers JSON à corriger après vérification:
- `/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/image-models.json`
- `/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/audio-models.json`
- `/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/chat-models.json`
