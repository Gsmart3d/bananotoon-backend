# ✅ Backend Vercel - CORRIGÉ

## Problèmes Résolus

### 1. ❌ Node.js Version (CRITIQUE)
**Avant:** `"node": "24.x"` ❌ N'existe pas !
**Après:** `"node": "20.x"` ✅ Version stable supportée par Vercel

### 2. ❌ Ancien système de quotas
**Avant:**
```javascript
quotaRemaining
subscriptionType: 'FREE' | 'STANDARD' | 'PREMIUM'
quotaResetDate
```

**Après:**
```javascript
totalCredits
subscriptionTier: 'free' | 'standard' | 'premium'
creditsResetAt
lifetimeTransformations
```

### 3. ✅ Logique mise à jour

**Fichiers corrigés:**
- ✅ `package.json` - Node 20.x
- ✅ `api/generate-image.js` - Nouveau système de crédits
- ✅ `api/award-ad-credit.js` - Ajoute crédits via pub
- ✅ `api/reset-weekly-quotas.js` - Reset hebdomadaire Standard uniquement

---

## Nouveau Système de Crédits

### Free Users
- **2 crédits lifetime** (pas de reset)
- Après utilisation → Must subscribe or buy packs
- Watch ad → +1 credit

### Standard Subscribers
- **50 crédits par semaine**
- Reset automatique chaque lundi
- Peut acheter des credit packs en plus

### Premium Subscribers
- **Unlimited crédits** (999999)
- Pas de vérification de quota
- Tracking via `lifetimeTransformations`

---

## Déploiement Vercel

### 1. Installer Vercel CLI
```bash
npm install -g vercel
```

### 2. Login Vercel
```bash
vercel login
```

### 3. Configurer les variables d'environnement
```bash
cd /home/gsm/AndroidStudioProjects/BananoToon/vercel-backend
vercel env add KIE_API_KEY
vercel env add FIREBASE_PROJECT_ID
vercel env add FIREBASE_PRIVATE_KEY
vercel env add FIREBASE_CLIENT_EMAIL
vercel env add CRON_SECRET
```

**Variables nécessaires:**
- `KIE_API_KEY` - Ta clé API KIE.AI
- `FIREBASE_PROJECT_ID` - ID du projet Firebase
- `FIREBASE_PRIVATE_KEY` - Clé privée Firebase (Service Account)
- `FIREBASE_CLIENT_EMAIL` - Email du Service Account
- `CRON_SECRET` - Secret pour les cron jobs (générer avec `openssl rand -base64 32`)

### 4. Déployer
```bash
# Test local
vercel dev

# Deploy preview
vercel

# Deploy production
vercel --prod
```

---

## Endpoints API

### POST /api/generate-image
Génère une image ou vidéo via KIE.AI

**Body:**
```json
{
  "userId": "user123",
  "style": "anime",          // ou "video" pour vidéo
  "imageUrl": "https://...", // Optionnel (image-to-image)
  "customPrompt": "...",     // Optionnel
  "image_size": "1:1",       // "1:1", "16:9", "9:16"
  "isPro": false,
  "duration": "5",           // Pour vidéo: 5 ou 10
  "resolution": "720p"       // Pour vidéo: 720p ou 1080p
}
```

**Réponse:**
```json
{
  "success": true,
  "taskId": "task_abc123",
  "message": "Transformation started!",
  "estimatedTime": "10-15 seconds"
}
```

**Erreurs:**
```json
{
  "error": "No credits",
  "message": "You have no credits. Subscribe or buy a credit pack!"
}
```

---

### POST /api/check-transformation
Vérifie le statut d'une transformation

**Body:**
```json
{
  "taskId": "task_abc123"
}
```

**Réponse:**
```json
{
  "status": "completed",
  "imageUrl": "https://...",
  "videoUrl": "https://..." // Pour vidéos
}
```

---

### POST /api/award-ad-credit
Donne +1 crédit après pub

**Body:**
```json
{
  "userId": "user123"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Credit awarded"
}
```

---

### CRON /api/reset-weekly-quotas
Reset hebdomadaire (Standard users uniquement)

**Planification:** Tous les lundis à 00:00 UTC

**Logique:**
- Free → Pas de reset (2 crédits lifetime)
- Standard → Reset à 50 crédits
- Premium → Pas de reset (unlimited)

---

## Tests

### Test local avec Vercel Dev
```bash
cd /home/gsm/AndroidStudioProjects/BananoToon/vercel-backend
vercel dev

# Dans un autre terminal
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "style": "anime",
    "imageUrl": "https://example.com/image.jpg"
  }'
```

### Test production
```bash
curl -X POST https://your-app.vercel.app/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "style": "anime"
  }'
```

---

## Vérifier le déploiement

### 1. Check Vercel Dashboard
- Aller sur https://vercel.com/dashboard
- Vérifier que le build passe (vert ✅)
- Vérifier les logs en temps réel

### 2. Check les variables d'environnement
```bash
vercel env ls
```

### 3. Test des endpoints
```bash
# Test simple
curl https://your-app.vercel.app/api/generate-image

# Devrait retourner error 405 (méthode GET non autorisée)
```

---

## Troubleshooting

### Error: "Node version 24.x not found"
✅ **CORRIGÉ** - Maintenant utilise Node 20.x

### Error: "quotaRemaining is not defined"
✅ **CORRIGÉ** - Maintenant utilise `totalCredits`

### Error: "Firebase not initialized"
➡️ Vérifier les variables d'environnement:
```bash
vercel env ls
```

### Error: "KIE.AI API error"
➡️ Vérifier `KIE_API_KEY`:
```bash
vercel env pull
cat .env.local | grep KIE_API_KEY
```

---

## Monitoring

### Logs en temps réel
```bash
vercel logs --follow
```

### Voir les dernières erreurs
```bash
vercel logs --since 1h
```

### Analytics Vercel
- Aller sur Dashboard → Analytics
- Voir requests/second, errors, latency

---

## Sécurité

### Variables sensibles
✅ Toutes les clés sont en variables d'environnement
✅ `.env.example` fourni (sans vraies clés)
✅ CRON_SECRET protège les endpoints cron

### CORS
Les endpoints publics ont CORS activé:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

---

## Coûts Vercel

### Plan Gratuit (Hobby)
- ✅ 100 GB bandwidth/mois
- ✅ 100 heures serverless/mois
- ✅ Unlimited deployments
- ✅ Cron jobs inclus

**Pour BananoToon:**
- Estimation: ~1000 transformations/jour
- Bandwidth: ~10 GB/mois
- ✅ Reste dans le plan gratuit

---

## Prochaines étapes

1. **Installer Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Ajouter variables d'environnement**
   ```bash
   cd /home/gsm/AndroidStudioProjects/BananoToon/vercel-backend
   vercel env add KIE_API_KEY
   # ... etc
   ```

4. **Deploy!**
   ```bash
   vercel --prod
   ```

5. **Copier l'URL**
   ```
   https://your-app.vercel.app
   ```

6. **Mettre à jour Flutter**
   Dans `lib/core/constants/api_keys.dart`:
   ```dart
   static const String kieApiBaseUrl = 'https://your-app.vercel.app';
   ```

---

**Backend prêt pour la production ! 🚀**
