#!/usr/bin/env python3
"""
Script amélioré pour extraire TOUTES les informations des fichiers HTML de documentation KIE API.
Version 2 avec parsing plus précis et extraction complète des paramètres.
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

def clean_html(text):
    """Nettoie les balises HTML d'un texte."""
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    return text.strip()

def extract_json_objects(content):
    """Extrait tous les objets JSON du contenu."""
    json_objects = []

    # Chercher des blocs JSON
    patterns = [
        r'\{[^{}]*"[^"]*"[^{}]*:[^{}]*\}',
        r'\{(?:[^{}]|(?:\{[^{}]*\}))*\}'
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, content, re.DOTALL)
        for match in matches:
            try:
                json_text = match.group(0)
                # Nettoyer
                json_text = re.sub(r',\s*}', '}', json_text)
                json_text = re.sub(r',\s*]', ']', json_text)
                obj = json.loads(json_text)
                json_objects.append(obj)
            except:
                pass

    return json_objects

def extract_endpoint_info(html_file):
    """Extrait les informations d'endpoint depuis un fichier HTML avec parsing approfondi."""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Initialiser la structure
        endpoint_info = {
            "file": str(html_file),
            "category": None,
            "name": None,
            "endpoint": None,
            "full_url": None,
            "method": None,
            "description": None,
            "modelIds": [],
            "parameters": {
                "required": {},
                "optional": {}
            },
            "pricing": {
                "credits": None,
                "notes": None
            },
            "examples": []
        }

        # Extraire le titre
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = clean_html(title_match.group(1))
            endpoint_info["name"] = title.replace(' - KIE API', '').strip()

        # Déterminer la catégorie
        file_path_lower = str(html_file).lower()
        if 'suno' in file_path_lower or '/music' in file_path_lower or 'audio' in file_path_lower or 'elevenlabs' in file_path_lower:
            endpoint_info["category"] = "audio"
        elif '/video' in file_path_lower or 'runway' in file_path_lower or 'luma' in file_path_lower or 'veo' in file_path_lower or 'kling' in file_path_lower or 'wan' in file_path_lower or 'sora' in file_path_lower or 'hailuo' in file_path_lower or 'bytedance' in file_path_lower:
            endpoint_info["category"] = "video"
        elif '/image' in file_path_lower or '4oimage' in file_path_lower or 'flux' in file_path_lower or 'grok imagine' in file_path_lower or 'ideogram' in file_path_lower or 'seedream' in file_path_lower or 'recraft' in file_path_lower:
            endpoint_info["category"] = "image"
        elif '/chat' in file_path_lower or 'claude' in file_path_lower or 'gemini' in file_path_lower:
            endpoint_info["category"] = "chat"
        else:
            endpoint_info["category"] = "other"

        # Extraire toutes les URLs d'API
        api_urls = re.findall(r'https://api\.kie\.ai(/[^"\s<>\']+)', content)
        if api_urls:
            # Prendre la première URL unique qui semble être un endpoint
            seen = set()
            for url in api_urls:
                full_url = f"https://api.kie.ai{url}"
                # Ignorer les URLs de callback ou de détails de tâche génériques
                if url not in seen and not url.endswith('\\'):
                    endpoint_info["full_url"] = full_url
                    endpoint_info["endpoint"] = url
                    seen.add(url)
                    break

        # Extraire la méthode HTTP
        method_patterns = [
            r'--request\s+(POST|GET|PUT|DELETE|PATCH)',
            r'-X\s+(POST|GET|PUT|DELETE|PATCH)',
            r'method["\']?\s*:\s*["\']?(POST|GET|PUT|DELETE|PATCH)',
            r'\b(POST|GET)\b.*?https://api\.kie\.ai'
        ]

        for pattern in method_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                endpoint_info["method"] = match.group(1).upper()
                break

        # Si pas de méthode trouvée, déduire
        if not endpoint_info["method"]:
            if re.search(r'\bcurl\b.*?\bPOST\b', content, re.IGNORECASE):
                endpoint_info["method"] = "POST"
            elif endpoint_info["endpoint"] and any(x in endpoint_info["endpoint"] for x in ['/get', '/details', '/info']):
                endpoint_info["method"] = "GET"
            else:
                endpoint_info["method"] = "POST"  # Par défaut

        # Extraire les modèles
        model_patterns = [
            r'"model"\s*:\s*"([^"]+)"',
            r'"modelId"\s*:\s*"([^"]+)"',
            r'model_id["\']?\s*:\s*["\']([^"\']+)',
            r'"model"\s*:\s*\[([^\]]+)\]',
        ]

        models_found = set()
        for pattern in model_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                model_text = match.group(1)
                # Si c'est une liste
                if '[' in model_text or ',' in model_text:
                    sub_models = re.findall(r'"([^"]+)"', model_text)
                    models_found.update(sub_models)
                else:
                    models_found.add(model_text)

        endpoint_info["modelIds"] = sorted(list(models_found))

        # Extraire les paramètres depuis les objets JSON
        json_objects = extract_json_objects(content)

        # Paramètres vus dans les exemples
        params_from_examples = {}
        for obj in json_objects:
            if isinstance(obj, dict):
                for key, value in obj.items():
                    if key not in params_from_examples:
                        param_type = "string"
                        if isinstance(value, bool):
                            param_type = "boolean"
                        elif isinstance(value, (int, float)):
                            param_type = "number"
                        elif isinstance(value, list):
                            param_type = "array"
                        elif isinstance(value, dict):
                            param_type = "object"

                        params_from_examples[key] = {
                            "type": param_type,
                            "description": "",
                            "default": value if not isinstance(value, (dict, list)) else None,
                            "example": value
                        }

        # Chercher les tables de paramètres dans le HTML
        # Pattern pour détecter les tables
        table_pattern = r'<table[^>]*>(.*?)</table>'
        tables = re.finditer(table_pattern, content, re.DOTALL | re.IGNORECASE)

        params_from_tables = {}
        for table_match in tables:
            table_content = table_match.group(1)
            # Extraire les lignes
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_content, re.DOTALL | re.IGNORECASE)

            # Skip header row
            for row in rows[1:]:
                cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)
                if len(cells) >= 2:
                    param_name = clean_html(cells[0]).strip()

                    # Valider le nom du paramètre
                    if not param_name or param_name.lower() in ['parameter', 'name', 'field', 'property', 'key']:
                        continue

                    # Type
                    param_type = "string"
                    if len(cells) > 1:
                        type_text = clean_html(cells[1]).lower()
                        if 'string' in type_text:
                            param_type = "string"
                        elif 'number' in type_text or 'integer' in type_text or 'int' in type_text or 'float' in type_text:
                            param_type = "number"
                        elif 'boolean' in type_text or 'bool' in type_text:
                            param_type = "boolean"
                        elif 'array' in type_text or 'list' in type_text or '[]' in type_text:
                            param_type = "array"
                        elif 'object' in type_text or '{}' in type_text:
                            param_type = "object"

                    # Description
                    description = ""
                    if len(cells) > 2:
                        description = clean_html(cells[2]).strip()

                    # Required
                    is_required = False
                    required_text = ""
                    if len(cells) > 3:
                        required_text = clean_html(cells[3]).lower()
                        is_required = 'yes' in required_text or 'required' in required_text or 'true' in required_text

                    # Default value
                    default_value = None
                    if len(cells) > 4:
                        default_text = clean_html(cells[4]).strip()
                        if default_text and default_text.lower() not in ['none', 'null', '-', '', 'n/a']:
                            default_value = default_text

                    param_info = {
                        "type": param_type,
                        "description": description,
                        "default": default_value
                    }

                    params_from_tables[param_name] = {
                        "info": param_info,
                        "required": is_required
                    }

        # Fusionner les paramètres des tables et des exemples
        all_params = {}

        # D'abord les paramètres des tables (priorité)
        for param_name, param_data in params_from_tables.items():
            all_params[param_name] = param_data

        # Ensuite les paramètres des exemples (si pas déjà dans les tables)
        for param_name, param_info in params_from_examples.items():
            if param_name not in all_params:
                # Essayer de deviner si c'est requis
                is_required = param_name in ['prompt', 'model', 'modelId', 'text', 'image']
                all_params[param_name] = {
                    "info": param_info,
                    "required": is_required
                }

        # Remplir la structure finale
        for param_name, param_data in all_params.items():
            if param_data["required"]:
                endpoint_info["parameters"]["required"][param_name] = param_data["info"]
            else:
                endpoint_info["parameters"]["optional"][param_name] = param_data["info"]

        # Extraire le pricing
        pricing_patterns = [
            r'(\d+)\s*credits?',
            r'cost[s]?\s*[:=]\s*(\d+)',
            r'price[s]?\s*[:=]\s*(\d+)',
            r'Credits?\s+Required\s*[:=]\s*(\d+)',
            r'Credit\s+Cost\s*[:=]\s*(\d+)',
            r'(\d+)\s+credit',
        ]

        for pattern in pricing_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            credits_list = []
            for match in matches:
                try:
                    credit_val = int(match.group(1))
                    if 1 <= credit_val <= 10000:  # Validation
                        credits_list.append(credit_val)
                except:
                    pass

            if credits_list:
                # Prendre le plus petit crédit non nul
                endpoint_info["pricing"]["credits"] = min(credits_list)
                break

        # Extraire les exemples curl (limité à 5)
        curl_patterns = [
            r'(curl\s+--request\s+(?:POST|GET)[^\n;]{50,800})',
            r'(curl\s+-X\s+(?:POST|GET)[^\n;]{50,800})',
        ]

        examples_found = set()
        for pattern in curl_patterns:
            matches = re.finditer(pattern, content, re.DOTALL)
            for match in matches:
                example = match.group(1).strip()
                # Nettoyer
                example = re.sub(r'<[^>]+>', '', example)
                example = re.sub(r'\s+', ' ', example)
                example = example[:1000]  # Limiter la taille

                if len(example) > 100 and example not in examples_found:
                    examples_found.add(example)
                    endpoint_info["examples"].append(example)
                    if len(endpoint_info["examples"]) >= 3:
                        break
            if len(endpoint_info["examples"]) >= 3:
                break

        # Extraire une description plus complète
        if not endpoint_info["description"]:
            # Chercher dans les heading et paragraphes
            desc_patterns = [
                r'<h1[^>]*>(.*?)</h1>',
                r'<h2[^>]*>(?:Description|Overview|About)</h2>\s*<p[^>]*>(.*?)</p>',
                r'<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</div>',
                r'<p[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</p>',
            ]
            for pattern in desc_patterns:
                match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
                if match:
                    desc = clean_html(match.group(1)).strip()
                    if desc and len(desc) > 20:
                        endpoint_info["description"] = desc[:500]
                        break

        return endpoint_info

    except Exception as e:
        print(f"Error processing {html_file}: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Fonction principale."""
    docskie_path = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')

    # Trouver tous les fichiers HTML
    html_files = list(docskie_path.rglob('*.html'))
    print(f"Found {len(html_files)} HTML files\n")

    # Extraire les informations
    endpoints = []
    for i, html_file in enumerate(html_files, 1):
        print(f"Processing {i}/{len(html_files)}: {html_file.name}")
        endpoint_info = extract_endpoint_info(html_file)
        if endpoint_info and endpoint_info["endpoint"]:
            endpoints.append(endpoint_info)

    # Créer le JSON final
    output = {
        "version": "1.0.0",
        "extracted_date": datetime.now().strftime("%Y-%m-%d"),
        "total_endpoints": len(endpoints),
        "categories": {},
        "endpoints": endpoints
    }

    # Compter par catégorie
    for endpoint in endpoints:
        cat = endpoint.get("category", "other")
        output["categories"][cat] = output["categories"].get(cat, 0) + 1

    # Statistiques
    total_params = sum(len(e["parameters"]["required"]) + len(e["parameters"]["optional"]) for e in endpoints)
    endpoints_with_models = sum(1 for e in endpoints if e["modelIds"])
    endpoints_with_pricing = sum(1 for e in endpoints if e["pricing"]["credits"])

    print(f"\n{'='*60}")
    print(f"✓ Extraction complete!")
    print(f"✓ Total endpoints: {len(endpoints)}")
    print(f"✓ Total parameters extracted: {total_params}")
    print(f"✓ Endpoints with models: {endpoints_with_models}")
    print(f"✓ Endpoints with pricing: {endpoints_with_pricing}")
    print(f"✓ Categories: {output['categories']}")

    # Sauvegarder
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✓ Output saved to: {output_file}")
    print(f"{'='*60}\n")

    # Afficher quelques exemples
    print("Sample endpoints:")
    for i, endpoint in enumerate(endpoints[:3]):
        print(f"\n{i+1}. {endpoint['name']}")
        print(f"   Endpoint: {endpoint['endpoint']}")
        print(f"   Method: {endpoint['method']}")
        print(f"   Models: {', '.join(endpoint['modelIds'][:3])}")
        print(f"   Params: {len(endpoint['parameters']['required'])} required, {len(endpoint['parameters']['optional'])} optional")
        if endpoint['pricing']['credits']:
            print(f"   Credits: {endpoint['pricing']['credits']}")

if __name__ == "__main__":
    main()
