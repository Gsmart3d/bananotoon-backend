# Exemples d'Intégration - API Endpoints Mapping

Ce document montre comment utiliser le fichier `api-endpoints-mapping.json` dans différents contextes.

## 📱 Android (Kotlin)

### 1. Charger le mapping JSON

```kotlin
// data/model/ApiEndpointModels.kt
data class ApiEndpoint(
    val name: String,
    val category: String,
    val endpoint: String,
    val full_url: String,
    val method: String,
    val modelIds: List<String>,
    val parameters: Parameters,
    val pricing: Pricing
)

data class Parameters(
    val required: Map<String, ParameterInfo>,
    val optional: Map<String, ParameterInfo>
)

data class ParameterInfo(
    val type: String,
    val example: Any?,
    val description: String
)

data class Pricing(
    val credits: Int?
)

data class ApiMapping(
    val version: String,
    val extracted_date: String,
    val description: String,
    val total_endpoints: Int,
    val categories: Map<String, Int>,
    val most_common_parameters: Map<String, Int>,
    val endpoints: List<ApiEndpoint>
)

// Repository
class ApiEndpointRepository(private val context: Context) {
    private var mapping: ApiMapping? = null

    fun loadMapping(): ApiMapping {
        if (mapping == null) {
            val json = context.assets.open("api-endpoints-mapping.json")
                .bufferedReader().use { it.readText() }
            mapping = Json.decodeFromString(json)
        }
        return mapping!!
    }

    fun getEndpointByName(name: String): ApiEndpoint? {
        return loadMapping().endpoints.find { it.name == name }
    }

    fun getEndpointsByCategory(category: String): List<ApiEndpoint> {
        return loadMapping().endpoints.filter { it.category == category }
    }

    fun getEndpointByModel(modelId: String): ApiEndpoint? {
        return loadMapping().endpoints.find { it.modelIds.contains(modelId) }
    }
}
```

### 2. ViewModel pour sélection de modèle

```kotlin
// presentation/viewmodel/ModelSelectionViewModel.kt
class ModelSelectionViewModel(
    private val endpointRepository: ApiEndpointRepository
) : ViewModel() {

    private val _videoModels = MutableStateFlow<List<VideoModelItem>>(emptyList())
    val videoModels = _videoModels.asStateFlow()

    init {
        loadVideoModels()
    }

    private fun loadVideoModels() {
        viewModelScope.launch {
            val endpoints = endpointRepository.getEndpointsByCategory("video")

            val models = endpoints
                .filter { it.modelIds.isNotEmpty() }
                .map { endpoint ->
                    VideoModelItem(
                        id = endpoint.modelIds.first(),
                        name = endpoint.name,
                        endpoint = endpoint.full_url,
                        requiredParams = endpoint.parameters.required.keys.toList(),
                        optionalParams = endpoint.parameters.optional.keys.toList(),
                        credits = endpoint.pricing.credits,
                        // Extraire les capacités depuis les paramètres
                        supportsDuration = endpoint.parameters.optional.containsKey("duration"),
                        supportsResolution = endpoint.parameters.optional.containsKey("resolution"),
                        supportsAspectRatio = endpoint.parameters.optional.containsKey("aspect_ratio")
                    )
                }

            _videoModels.value = models
        }
    }

    fun getModelById(modelId: String): VideoModelItem? {
        return _videoModels.value.find { it.id == modelId }
    }
}

data class VideoModelItem(
    val id: String,
    val name: String,
    val endpoint: String,
    val requiredParams: List<String>,
    val optionalParams: List<String>,
    val credits: Int?,
    val supportsDuration: Boolean,
    val supportsResolution: Boolean,
    val supportsAspectRatio: Boolean
)
```

### 3. Composable pour sélection dynamique

```kotlin
// presentation/screens/ModelSelectionScreen.kt
@Composable
fun ModelSelectionScreen(
    viewModel: ModelSelectionViewModel,
    onModelSelected: (VideoModelItem) -> Unit
) {
    val models by viewModel.videoModels.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp)
    ) {
        items(models) { model ->
            ModelCard(
                model = model,
                onClick = { onModelSelected(model) }
            )
        }
    }
}

@Composable
fun ModelCard(
    model: VideoModelItem,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = model.name,
                style = MaterialTheme.typography.titleMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row {
                if (model.supportsDuration) {
                    Chip(text = "Duration")
                }
                if (model.supportsResolution) {
                    Chip(text = "Resolution")
                }
                if (model.supportsAspectRatio) {
                    Chip(text = "Aspect Ratio")
                }
            }

            if (model.credits != null) {
                Text(
                    text = "${model.credits} credits",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary
                )
            }

            Text(
                text = "Model: ${model.id}",
                style = MaterialTheme.typography.bodySmall,
                fontFamily = FontFamily.Monospace
            )
        }
    }
}

@Composable
fun Chip(text: String) {
    Surface(
        modifier = Modifier.padding(end = 4.dp),
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.primaryContainer
    ) {
        Text(
            text = text,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall
        )
    }
}
```

### 4. Générateur de requête dynamique

```kotlin
// data/repository/DynamicRequestBuilder.kt
class DynamicRequestBuilder(
    private val endpointRepository: ApiEndpointRepository
) {
    fun buildRequest(
        modelId: String,
        userInput: Map<String, Any>
    ): Result<RequestData> {
        val endpoint = endpointRepository.getEndpointByModel(modelId)
            ?: return Result.failure(Exception("Model not found: $modelId"))

        // Valider les paramètres requis
        val missingParams = endpoint.parameters.required.keys
            .filter { it !in userInput.keys }

        if (missingParams.isNotEmpty()) {
            return Result.failure(
                Exception("Missing required parameters: ${missingParams.joinToString()}")
            )
        }

        // Construire le body
        val body = buildMap {
            put("model", modelId)

            // Paramètres d'input
            val inputParams = userInput.filterKeys { key ->
                key in endpoint.parameters.required.keys ||
                key in endpoint.parameters.optional.keys
            }

            if (inputParams.isNotEmpty()) {
                put("input", inputParams)
            }

            // Autres paramètres top-level (webhook, etc.)
            userInput["webhook_url"]?.let { put("webhook_url", it) }
        }

        return Result.success(
            RequestData(
                url = endpoint.full_url,
                method = endpoint.method,
                body = body
            )
        )
    }
}

data class RequestData(
    val url: String,
    val method: String,
    val body: Map<String, Any>
)
```

### 5. Intégration avec l'API existante

```kotlin
// data/repository/KieApiRepository.kt (mise à jour)
class KieApiRepository(
    private val endpointRepository: ApiEndpointRepository,
    private val requestBuilder: DynamicRequestBuilder
) {
    suspend fun generateVideo(
        modelId: String,
        imageUrl: String,
        prompt: String?,
        duration: Int?,
        resolution: String?
    ): Result<String> {
        // Construire les paramètres
        val userInput = buildMap<String, Any> {
            put("image_url", imageUrl)
            prompt?.let { put("prompt", it) }
            duration?.let { put("duration", it) }
            resolution?.let { put("resolution", it) }
        }

        // Construire la requête dynamiquement
        val requestData = requestBuilder.buildRequest(modelId, userInput)
            .getOrElse { return Result.failure(it) }

        // Appeler l'API
        return try {
            val response = apiService.createTask(
                url = requestData.url,
                body = requestData.body
            )

            if (response.code == 200) {
                Result.success(response.data.taskId)
            } else {
                Result.failure(Exception(response.message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

## 🌐 JavaScript/Node.js

### Exemple serveur (Vercel)

```javascript
// api/dynamic-generate.js
const mapping = require('../api-endpoints-mapping.json');

export default async function handler(req, res) {
  const { modelId, ...params } = req.body;

  // Trouver l'endpoint
  const endpoint = mapping.endpoints.find(ep =>
    ep.modelIds.includes(modelId)
  );

  if (!endpoint) {
    return res.status(400).json({ error: 'Model not found' });
  }

  // Valider les paramètres requis
  const requiredParams = Object.keys(endpoint.parameters.required);
  const missingParams = requiredParams.filter(p => !(p in params));

  if (missingParams.length > 0) {
    return res.status(400).json({
      error: 'Missing required parameters',
      missing: missingParams
    });
  }

  // Construire la requête
  const requestBody = {
    model: modelId,
    input: params
  };

  // Appeler KIE API
  try {
    const kieResponse = await fetch(endpoint.full_url, {
      method: endpoint.method,
      headers: {
        'Authorization': `Bearer ${process.env.KIE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await kieResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

## 🐍 Python

### Classe helper

```python
# utils/kie_api_helper.py
import json
from typing import Dict, List, Optional, Any

class KieApiHelper:
    def __init__(self, mapping_file: str = 'api-endpoints-mapping.json'):
        with open(mapping_file, 'r') as f:
            self.mapping = json.load(f)

    def get_endpoint_by_model(self, model_id: str) -> Optional[Dict]:
        """Trouve un endpoint par son model ID."""
        for endpoint in self.mapping['endpoints']:
            if model_id in endpoint['modelIds']:
                return endpoint
        return None

    def get_endpoints_by_category(self, category: str) -> List[Dict]:
        """Récupère tous les endpoints d'une catégorie."""
        return [
            ep for ep in self.mapping['endpoints']
            if ep['category'] == category
        ]

    def validate_params(self, model_id: str, params: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Valide les paramètres pour un modèle."""
        endpoint = self.get_endpoint_by_model(model_id)
        if not endpoint:
            return False, [f"Model {model_id} not found"]

        required = endpoint['parameters']['required'].keys()
        missing = [p for p in required if p not in params]

        return len(missing) == 0, missing

    def build_request(self, model_id: str, params: Dict[str, Any]) -> Optional[Dict]:
        """Construit une requête pour un modèle."""
        endpoint = self.get_endpoint_by_model(model_id)
        if not endpoint:
            return None

        return {
            'url': endpoint['full_url'],
            'method': endpoint['method'],
            'body': {
                'model': model_id,
                'input': params
            }
        }

# Utilisation
helper = KieApiHelper()

# Valider
is_valid, missing = helper.validate_params('wan/2-6-image-to-video', {
    'image_url': 'https://example.com/image.jpg',
    'prompt': 'A fox singing'
})

if is_valid:
    request = helper.build_request('wan/2-6-image-to-video', {
        'image_url': 'https://example.com/image.jpg',
        'prompt': 'A fox singing',
        'duration': 5
    })
    print(request)
```

## 🔍 Cas d'usage avancés

### 1. Comparaison de modèles

```kotlin
fun compareModels(modelIds: List<String>): List<ModelComparison> {
    return modelIds.mapNotNull { modelId ->
        val endpoint = endpointRepository.getEndpointByModel(modelId)
        endpoint?.let {
            ModelComparison(
                modelId = modelId,
                name = it.name,
                credits = it.pricing.credits,
                paramCount = it.parameters.required.size + it.parameters.optional.size,
                features = extractFeatures(it)
            )
        }
    }
}

data class ModelComparison(
    val modelId: String,
    val name: String,
    val credits: Int?,
    val paramCount: Int,
    val features: List<String>
)
```

### 2. Auto-complétion de paramètres

```kotlin
fun getAvailableParams(modelId: String): List<ParamSuggestion> {
    val endpoint = endpointRepository.getEndpointByModel(modelId)
        ?: return emptyList()

    return (endpoint.parameters.required + endpoint.parameters.optional)
        .map { (name, info) ->
            ParamSuggestion(
                name = name,
                type = info.type,
                required = name in endpoint.parameters.required,
                example = info.example,
                description = info.description
            )
        }
}

data class ParamSuggestion(
    val name: String,
    val type: String,
    val required: Boolean,
    val example: Any?,
    val description: String
)
```

### 3. Estimation des coûts

```kotlin
class CostEstimator(private val endpointRepository: ApiEndpointRepository) {
    fun estimateCost(modelId: String, quantity: Int = 1): CostEstimate {
        val endpoint = endpointRepository.getEndpointByModel(modelId)
        val credits = endpoint?.pricing?.credits ?: 0

        return CostEstimate(
            modelId = modelId,
            quantity = quantity,
            creditsPerGeneration = credits,
            totalCredits = credits * quantity,
            estimatedUsdCost = (credits * quantity) * 0.01 // 1 crédit = $0.01
        )
    }
}

data class CostEstimate(
    val modelId: String,
    val quantity: Int,
    val creditsPerGeneration: Int,
    val totalCredits: Int,
    val estimatedUsdCost: Double
)
```

## 🧪 Tests unitaires

```kotlin
class ApiEndpointRepositoryTest {
    private lateinit var repository: ApiEndpointRepository

    @Before
    fun setup() {
        val context = InstrumentationRegistry.getInstrumentation().context
        repository = ApiEndpointRepository(context)
    }

    @Test
    fun `should load mapping successfully`() {
        val mapping = repository.loadMapping()
        assertTrue(mapping.endpoints.isNotEmpty())
        assertEquals("2.0.0", mapping.version)
    }

    @Test
    fun `should find video endpoints`() {
        val videoEndpoints = repository.getEndpointsByCategory("video")
        assertTrue(videoEndpoints.isNotEmpty())
        assertTrue(videoEndpoints.all { it.category == "video" })
    }

    @Test
    fun `should find Wan 2-6 model`() {
        val endpoint = repository.getEndpointByModel("wan/2-6-image-to-video")
        assertNotNull(endpoint)
        assertEquals("Wan 2.6 - Image to Video", endpoint?.name)
    }

    @Test
    fun `should validate required parameters`() {
        val endpoint = repository.getEndpointByModel("wan/2-6-image-to-video")
        assertNotNull(endpoint)
        assertTrue(endpoint!!.parameters.required.containsKey("model"))
        assertTrue(endpoint.parameters.required.containsKey("input"))
    }
}
```

## 📦 Mise en production

### Étapes d'intégration

1. **Copier le JSON dans assets/**
   ```
   app/src/main/assets/api-endpoints-mapping.json
   ```

2. **Ajouter les data classes**
   ```
   app/src/main/java/com/tonstudio/bananotoon/data/model/ApiEndpointModels.kt
   ```

3. **Créer le repository**
   ```
   app/src/main/java/com/tonstudio/bananotoon/data/repository/ApiEndpointRepository.kt
   ```

4. **Injecter avec Hilt**
   ```kotlin
   @Module
   @InstallIn(SingletonComponent::class)
   object AppModule {
       @Provides
       @Singleton
       fun provideApiEndpointRepository(
           @ApplicationContext context: Context
       ): ApiEndpointRepository {
           return ApiEndpointRepository(context)
       }
   }
   ```

5. **Utiliser dans les ViewModels**
   ```kotlin
   @HiltViewModel
   class TransformViewModel @Inject constructor(
       private val endpointRepository: ApiEndpointRepository,
       // ...
   ) : ViewModel()
   ```

---

**Note**: Ces exemples sont prêts à être intégrés dans votre projet BananoToon. Adaptez-les selon vos besoins spécifiques.
