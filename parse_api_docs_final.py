#!/usr/bin/env python3
"""
Script FINAL ultra-précis pour extraire toutes les informations des fichiers HTML KIE API.
Version finale avec filtrage du bruit et extraction précise des vrais paramètres d'API.
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime

# Paramètres JavaScript à ignorer (bruit du site web)
NOISE_PARAMS = {
    'true', 'false', 'dark', 'light', 'children', 'id', 'name', 'location_startswith',
    'cfCacheStatus', 'cfEdge', 'cfExtPri', 'cfL4', 'cfOrigin', 'cfSpeedBrain',
    'className', 'style', 'href', 'onClick', 'onChange', 'onLoad', 'src', 'alt',
    'title', 'type', 'value', 'placeholder', 'aria-', 'data-', 'key', 'ref',
    'defaultValue', 'defaultChecked', 'disabled', 'readOnly', 'required'
}

def clean_html(text):
    """Nettoie les balises HTML d'un texte."""
    if not text:
        return ""
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def is_valid_api_param(param_name):
    """Vérifie si un nom de paramètre est valide pour une API."""
    if not param_name or len(param_name) < 2:
        return False
    if param_name.lower() in NOISE_PARAMS:
        return False
    if param_name.startswith(('cf', 'data-', 'aria-', '_mintlify')):
        return False
    if re.match(r'^[A-Z][a-z]+[A-Z]', param_name):  # camelCase probable pour UI
        if any(ui_word in param_name.lower() for ui_word in ['button', 'modal', 'dialog', 'menu', 'nav', 'header', 'footer']):
            return False
    return True

def extract_request_params(content):
    """Extrait les paramètres de requête depuis les exemples de code."""
    params = {}

    # Chercher les blocs de code JSON (Request Body, Request Example, etc.)
    json_blocks = []

    # Pattern pour trouver les sections de requêtes
    request_patterns = [
        r'Request Body[^{]*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})',
        r'Request Example[^{]*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})',
        r'Example Request[^{]*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})',
        r'Body Parameters[^{]*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})',
        r'"body":\s*(\{[^}]*(?:\{[^}]*\}[^}]*)*\})',
    ]

    for pattern in request_patterns:
        matches = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
        for match in matches:
            json_blocks.append(match.group(1))

    # Parser les blocs JSON
    for json_block in json_blocks:
        try:
            # Nettoyer le JSON
            json_cleaned = re.sub(r',(\s*[}\]])', r'\1', json_block)
            json_cleaned = re.sub(r'//.*?$', '', json_cleaned, flags=re.MULTILINE)
            json_obj = json.loads(json_cleaned)

            if isinstance(json_obj, dict):
                for key, value in json_obj.items():
                    if is_valid_api_param(key):
                        param_type = "string"
                        if isinstance(value, bool):
                            param_type = "boolean"
                        elif isinstance(value, int) or isinstance(value, float):
                            param_type = "number"
                        elif isinstance(value, list):
                            param_type = "array"
                        elif isinstance(value, dict):
                            param_type = "object"

                        params[key] = {
                            "type": param_type,
                            "description": "",
                            "default": None,
                            "example": value if not isinstance(value, (dict, list)) else None
                        }
        except Exception as e:
            # Essayer une approche plus simple avec regex
            param_matches = re.finditer(r'"([a-zA-Z_][a-zA-Z0-9_]*)"\s*:\s*("(?:[^"\\]|\\.)*"|true|false|null|\d+\.?\d*|\[.*?\])', json_block)
            for match in param_matches:
                param_name = match.group(1)
                param_value = match.group(2)

                if is_valid_api_param(param_name):
                    param_type = "string"
                    example_val = None

                    if param_value in ['true', 'false']:
                        param_type = "boolean"
                        example_val = param_value == 'true'
                    elif param_value == 'null':
                        param_type = "string"
                    elif re.match(r'^\d+\.?\d*$', param_value):
                        param_type = "number"
                        example_val = float(param_value) if '.' in param_value else int(param_value)
                    elif param_value.startswith('['):
                        param_type = "array"
                    elif param_value.startswith('"'):
                        param_type = "string"
                        example_val = param_value.strip('"')

                    params[param_name] = {
                        "type": param_type,
                        "description": "",
                        "default": None,
                        "example": example_val
                    }

    return params

def extract_table_params(content):
    """Extrait les paramètres depuis les tables HTML."""
    params = {}

    # Trouver les tables
    table_pattern = r'<table[^>]*>(.*?)</table>'
    tables = re.finditer(table_pattern, content, re.DOTALL | re.IGNORECASE)

    for table_match in tables:
        table_content = table_match.group(1)

        # Extraire les lignes
        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_content, re.DOTALL | re.IGNORECASE)

        # Analyser les headers pour comprendre la structure
        if not rows:
            continue

        header_row = rows[0]
        headers = [clean_html(cell).lower() for cell in re.findall(r'<th[^>]*>(.*?)</th>', header_row, re.DOTALL | re.IGNORECASE)]

        # Si pas de headers, essayer avec des td
        if not headers:
            headers = [clean_html(cell).lower() for cell in re.findall(r'<td[^>]*>(.*?)</td>', header_row, re.DOTALL | re.IGNORECASE)]

        # Trouver les index des colonnes importantes
        name_idx = -1
        type_idx = -1
        desc_idx = -1
        required_idx = -1
        default_idx = -1

        for i, header in enumerate(headers):
            if 'name' in header or 'parameter' in header or 'field' in header:
                name_idx = i
            elif 'type' in header:
                type_idx = i
            elif 'description' in header or 'desc' in header:
                desc_idx = i
            elif 'required' in header or 'optional' in header:
                required_idx = i
            elif 'default' in header:
                default_idx = i

        # Traiter les lignes de données
        for row in rows[1:]:
            cells = [clean_html(cell) for cell in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL | re.IGNORECASE)]

            if len(cells) < 2:
                continue

            # Extraire le nom du paramètre
            param_name = cells[name_idx] if name_idx >= 0 and name_idx < len(cells) else cells[0]
            param_name = param_name.strip()

            if not is_valid_api_param(param_name):
                continue

            # Type
            param_type = "string"
            if type_idx >= 0 and type_idx < len(cells):
                type_text = cells[type_idx].lower()
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
            if desc_idx >= 0 and desc_idx < len(cells):
                description = cells[desc_idx]

            # Required
            is_required = False
            if required_idx >= 0 and required_idx < len(cells):
                req_text = cells[required_idx].lower()
                is_required = 'yes' in req_text or 'required' in req_text or 'true' in req_text

            # Default
            default_value = None
            if default_idx >= 0 and default_idx < len(cells):
                default_text = cells[default_idx]
                if default_text and default_text.lower() not in ['none', 'null', '-', '', 'n/a']:
                    default_value = default_text

            params[param_name] = {
                "info": {
                    "type": param_type,
                    "description": description,
                    "default": default_value,
                    "example": None
                },
                "required": is_required
            }

    return params

def extract_endpoint_info(html_file):
    """Extrait les informations d'endpoint avec filtrage du bruit."""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

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

        # Titre
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = clean_html(title_match.group(1))
            endpoint_info["name"] = title.replace(' - KIE API', '').replace('KIE API', '').strip()

        # Catégorie
        file_path_lower = str(html_file).lower()
        if 'suno' in file_path_lower or '/music' in file_path_lower or 'elevenlabs' in file_path_lower:
            endpoint_info["category"] = "audio"
        elif 'runway' in file_path_lower or 'luma' in file_path_lower or 'veo' in file_path_lower or 'kling' in file_path_lower or 'wan' in file_path_lower or 'sora' in file_path_lower or 'hailuo' in file_path_lower or 'bytedance' in file_path_lower or 'infinitalk' in file_path_lower or '/video' in file_path_lower:
            endpoint_info["category"] = "video"
        elif '4oimage' in file_path_lower or 'flux' in file_path_lower or 'grok' in file_path_lower or 'ideogram' in file_path_lower or 'seedream' in file_path_lower or 'recraft' in file_path_lower or 'qwen' in file_path_lower or 'topaz' in file_path_lower or '/image' in file_path_lower:
            endpoint_info["category"] = "image"
        elif 'claude' in file_path_lower or 'gemini' in file_path_lower or '/chat' in file_path_lower:
            endpoint_info["category"] = "chat"
        else:
            endpoint_info["category"] = "other"

        # URLs d'API (chercher seulement les vraies URLs d'API)
        api_url_pattern = r'https://api\.kie\.ai(/api/v\d+/[a-zA-Z0-9/_-]+)'
        api_urls = re.findall(api_url_pattern, content)

        if api_urls:
            # Filtrer et prendre la première URL valide
            for url_path in api_urls:
                # Ignorer les URLs génériques
                if not any(skip in url_path for skip in ['record-info', 'example', 'test']):
                    endpoint_info["endpoint"] = url_path
                    endpoint_info["full_url"] = f"https://api.kie.ai{url_path}"
                    break

        # Méthode HTTP
        if re.search(r'--request\s+POST|"POST"|method.*POST', content, re.IGNORECASE):
            endpoint_info["method"] = "POST"
        elif re.search(r'--request\s+GET|"GET"|method.*GET', content, re.IGNORECASE):
            endpoint_info["method"] = "GET"
        else:
            endpoint_info["method"] = "POST"  # Par défaut

        # Modèles
        model_pattern = r'"model"\s*:\s*"([a-zA-Z0-9/_-]+)"'
        models = re.findall(model_pattern, content)
        endpoint_info["modelIds"] = sorted(list(set(models)))

        # Paramètres depuis les tables
        table_params = extract_table_params(content)

        # Paramètres depuis les exemples
        request_params = extract_request_params(content)

        # Fusionner (priorité aux tables)
        all_params = {}
        for param_name, param_data in table_params.items():
            all_params[param_name] = param_data

        for param_name, param_info in request_params.items():
            if param_name not in all_params:
                # Deviner si requis
                is_required = param_name in ['prompt', 'model', 'modelId', 'text', 'image', 'input']
                all_params[param_name] = {
                    "info": param_info,
                    "required": is_required
                }

        # Remplir les paramètres finaux
        for param_name, param_data in all_params.items():
            if param_data["required"]:
                endpoint_info["parameters"]["required"][param_name] = param_data["info"]
            else:
                endpoint_info["parameters"]["optional"][param_name] = param_data["info"]

        # Pricing
        credit_matches = re.findall(r'(\d+)\s*credits?', content, re.IGNORECASE)
        valid_credits = [int(c) for c in credit_matches if 1 <= int(c) <= 10000]
        if valid_credits:
            endpoint_info["pricing"]["credits"] = min(valid_credits)

        # Description
        desc_patterns = [
            r'<h1[^>]*>(.*?)</h1>.*?<p[^>]*>(.*?)</p>',
            r'<h2[^>]*>(?:Description|Overview)</h2>\s*<p[^>]*>(.*?)</p>',
        ]
        for pattern in desc_patterns:
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                desc = clean_html(match.group(1) if match.lastindex == 1 else match.group(2))
                if desc and len(desc) > 20 and len(desc) < 500:
                    endpoint_info["description"] = desc
                    break

        # Exemples curl
        curl_pattern = r'curl\s+--request\s+\w+\s+https://api\.kie\.ai[^\n]{50,500}'
        curl_examples = re.findall(curl_pattern, content, re.IGNORECASE)
        endpoint_info["examples"] = [clean_html(ex)[:500] for ex in curl_examples[:2]]

        return endpoint_info

    except Exception as e:
        print(f"Error: {html_file.name}: {e}")
        return None

def main():
    """Fonction principale."""
    docskie_path = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')
    html_files = list(docskie_path.rglob('*.html'))

    print(f"{'='*70}")
    print(f"KIE API Documentation Parser - Final Version")
    print(f"{'='*70}")
    print(f"Found {len(html_files)} HTML files\n")

    endpoints = []
    skipped = 0

    for i, html_file in enumerate(html_files, 1):
        print(f"[{i:3d}/{len(html_files)}] {html_file.name[:60]:<60}", end=" ")
        endpoint_info = extract_endpoint_info(html_file)

        if endpoint_info and endpoint_info["endpoint"]:
            param_count = len(endpoint_info["parameters"]["required"]) + len(endpoint_info["parameters"]["optional"])
            print(f"✓ ({param_count} params)")
            endpoints.append(endpoint_info)
        else:
            print("✗ skipped")
            skipped += 1

    # Créer le JSON final
    output = {
        "version": "1.0.0",
        "extracted_date": datetime.now().strftime("%Y-%m-%d"),
        "extraction_notes": "Extracted from KIE API HTML documentation with noise filtering",
        "total_endpoints": len(endpoints),
        "categories": {},
        "endpoints": endpoints
    }

    # Statistiques
    for endpoint in endpoints:
        cat = endpoint.get("category", "other")
        output["categories"][cat] = output["categories"].get(cat, 0) + 1

    total_params = sum(len(e["parameters"]["required"]) + len(e["parameters"]["optional"]) for e in endpoints)
    endpoints_with_models = sum(1 for e in endpoints if e["modelIds"])
    endpoints_with_pricing = sum(1 for e in endpoints if e["pricing"]["credits"])

    # Sauvegarder
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*70}")
    print(f"✓ Extraction complete!")
    print(f"{'='*70}")
    print(f"Total endpoints extracted:    {len(endpoints)}")
    print(f"Files skipped:                {skipped}")
    print(f"Total parameters extracted:   {total_params}")
    print(f"Endpoints with models:        {endpoints_with_models}")
    print(f"Endpoints with pricing:       {endpoints_with_pricing}")
    print(f"Categories breakdown:         {output['categories']}")
    print(f"Output file:                  {output_file}")
    print(f"{'='*70}\n")

    # Exemples
    print("Sample endpoints:\n")
    for i, endpoint in enumerate(endpoints[:5], 1):
        req = len(endpoint['parameters']['required'])
        opt = len(endpoint['parameters']['optional'])
        models = ', '.join(endpoint['modelIds'][:2]) if endpoint['modelIds'] else 'N/A'
        print(f"{i}. {endpoint['name']}")
        print(f"   Endpoint: {endpoint['endpoint']}")
        print(f"   Method:   {endpoint['method']}")
        print(f"   Models:   {models}")
        print(f"   Params:   {req} required, {opt} optional")
        if endpoint['pricing']['credits']:
            print(f"   Credits:  {endpoint['pricing']['credits']}")
        print()

if __name__ == "__main__":
    main()
