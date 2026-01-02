# 🎨 BananoToon - API KIE.AI Integration

## 📋 Variables d'environnement à ajouter

Va sur **Vercel Dashboard** → **Settings** → **Environment Variables** et ajoute :

```
KIE_API_KEY = ta_clé_api_kie_ai
```

## 🎯 Endpoints créés

### 1. `/api/generate-image` - Générer une transformation

**POST** `https://bananotoon-backend-six.vercel.app/api/generate-image`

**Body** :
```json
{
  "userId": "user123",
  "style": "pixar",
  "imageUrl": "https://example.com/photo.jpg"  // Optionnel (si fourni = edit, sinon = generate)
}
```

**Réponse** :
```json
{
  "success": true,
  "taskId": "abc123...",
  "message": "Transformation started!",
  "estimatedTime": "10-15 seconds"
}
```

---

### 2. `/api/check-transformation` - Vérifier le statut

**GET** `https://bananotoon-backend-six.vercel.app/api/check-transformation?taskId=abc123`

**Réponse** :
```json
{
  "success": true,
  "transformation": {
    "taskId": "abc123",
    "status": "completed",  // pending | completed | failed
    "transformedImageUrl": "https://example.com/result.jpg",
    "style": "pixar",
    "createdAt": "...",
    "completedAt": "..."
  }
}
```

---

### 3. `/api/kie-callback` - Callback KIE.AI (automatique)

KIE.AI appelle cet endpoint automatiquement quand la génération est terminée.

---

## 🎨 Styles disponibles

| Style | Clé | Description |
|-------|-----|-------------|
| Pixar | `pixar` | Style 3D animation Pixar |
| Manga | `manga` | Style manga japonais noir et blanc |
| Anime | `anime` | Style anime coloré |
| Cartoon | `cartoon` | Cartoon moderne |
| Watercolor | `watercolor` | Peinture aquarelle |
| Oil Painting | `oilpainting` | Peinture à l'huile classique |
| Sketch | `sketch` | Dessin au crayon |
| Comic | `comic` | Comic book américain |
| Fantasy | `fantasy` | Art fantasy épique |
| Cyberpunk | `cyberpunk` | Cyberpunk néon futuriste |
| Retro | `retro` | Rétro années 80 |

---

## 🔄 Flow complet

1. **App Android** → Upload photo (base64 ou URL)
2. **App Android** → Appelle `/api/generate-image` avec userId + style + imageUrl
3. **Backend Vercel** :
   - Vérifie quota utilisateur
   - Appelle KIE.AI
   - Décrémente quota
   - Retourne taskId
4. **App Android** → Poll `/api/check-transformation` toutes les 2 secondes
5. **KIE.AI** → Appelle `/api/kie-callback` quand terminé
6. **Backend Vercel** → Met à jour Firestore
7. **App Android** → Récupère l'image transformée

---

## 📝 Structure Firestore

### Collection `transformations`

```javascript
{
  taskId: string,              // ID de la tâche KIE.AI
  userId: string,              // ID utilisateur
  style: string,               // Style choisi (pixar, manga, etc.)
  prompt: string,              // Prompt complet généré
  originalImageUrl: string,    // URL de l'image originale
  transformedImageUrl: string, // URL de l'image transformée (après callback)
  status: string,              // pending | completed | failed
  errorMessage: string,        // Si failed
  createdAt: timestamp,
  completedAt: timestamp,
  subscriptionTypeAtCreation: string  // free | standard | premium
}
```

---

## 🧪 Test manuel

```bash
# 1. Générer une transformation
curl -X POST https://bananotoon-backend-six.vercel.app/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "style": "pixar",
    "imageUrl": "https://file.aiquickdraw.com/custom-page/akr/section-images/1756223420389w8xa2jfe.png"
  }'

# Réponse : {"success":true,"taskId":"abc123..."}

# 2. Vérifier le statut (répéter jusqu'à status=completed)
curl https://bananotoon-backend-six.vercel.app/api/check-transformation?taskId=abc123

# Réponse : {"success":true,"transformation":{...,"transformedImageUrl":"https://..."}}
```

---

## ✅ Avantages de cette approche

- ✅ **Pas de stockage** : Pas besoin de Google Drive, Firebase Storage, etc.
- ✅ **Simple** : KIE.AI gère tout (génération + hosting des images)
- ✅ **Gratuit** : Pas de coûts de stockage
- ✅ **Rapide** : 10-15 secondes par transformation
- ✅ **Callback** : Pas besoin de polling agressif côté client

---

## ⚠️ Notes importantes

1. **Images temporaires** : Les URLs KIE.AI peuvent expirer après quelques jours
2. **Quotas** : Le système de quotas fonctionne toujours (5/semaine gratuit)
3. **Abonnements** : Standard (50/semaine) et Premium (illimité) fonctionnent
4. **Pas de galerie permanente** : Les transformations ne sont pas stockées à long terme
