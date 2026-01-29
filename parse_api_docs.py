#!/usr/bin/env python3
"""
Script pour extraire toutes les informations des fichiers HTML de documentation KIE API
et créer un mapping JSON structuré de tous les endpoints.
"""

import os
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime

def extract_endpoint_info(html_file):
    """Extrait les informations d'endpoint depuis un fichier HTML."""
    try:
        with open(html_file, 'r', encoding='utf-8') as f:
            content = f.read()

        soup = BeautifulSoup(content, 'html.parser')

        # Initialiser la structure de données
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
        title_tag = soup.find('title')
        if title_tag:
            endpoint_info["name"] = title_tag.text.replace(' - KIE API', '').strip()

        # Déterminer la catégorie depuis le chemin
        file_path = Path(html_file)
        parts = file_path.parts
        if 'image' in str(file_path).lower():
            endpoint_info["category"] = "image"
        elif 'video' in str(file_path).lower():
            endpoint_info["category"] = "video"
        elif 'audio' in str(file_path).lower() or 'music' in str(file_path).lower() or 'suno' in str(file_path).lower():
            endpoint_info["category"] = "audio"
        elif 'chat' in str(file_path).lower():
            endpoint_info["category"] = "chat"
        else:
            endpoint_info["category"] = "other"

        # Extraire la description
        desc_patterns = [
            r'<h1[^>]*>(.*?)</h1>',
            r'<h2[^>]*>Description</h2>\s*<p[^>]*>(.*?)</p>',
            r'<div[^>]*class="[^"]*description[^"]*"[^>]*>(.*?)</div>'
        ]
        for pattern in desc_patterns:
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                desc = BeautifulSoup(match.group(1), 'html.parser').get_text().strip()
                if desc and len(desc) > 10:
                    endpoint_info["description"] = desc[:500]
                    break

        # Extraire les URLs et méthodes HTTP depuis les exemples curl
        curl_patterns = [
            r'curl\s+--request\s+(POST|GET|PUT|DELETE)\s+["\']?(https://api\.kie\.ai[^"\'\s]+)',
            r'curl\s+-X\s+(POST|GET|PUT|DELETE)\s+["\']?(https://api\.kie\.ai[^"\'\s]+)',
            r'(POST|GET|PUT|DELETE)\s+(https://api\.kie\.ai[^"\'\s<]+)',
        ]

        for pattern in curl_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE)
            for match in matches:
                method = match.group(1).upper()
                url = match.group(2).strip('"\'<>')
                if not endpoint_info["method"]:
                    endpoint_info["method"] = method
                if not endpoint_info["full_url"]:
                    endpoint_info["full_url"] = url
                    # Extraire l'endpoint depuis l'URL
                    endpoint_path = url.replace('https://api.kie.ai', '')
                    endpoint_info["endpoint"] = endpoint_path
                break
            if endpoint_info["method"]:
                break

        # Si pas trouvé dans curl, chercher dans le texte
        if not endpoint_info["full_url"]:
            url_patterns = [
                r'https://api\.kie\.ai/api/v\d+/[^\s<>"\']+',
                r'endpoint["\']?\s*:\s*["\']([^"\']+)',
                r'URL["\']?\s*:\s*["\']?(https://api\.kie\.ai[^"\'<>\s]+)'
            ]
            for pattern in url_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    if match.group(0).startswith('http'):
                        endpoint_info["full_url"] = match.group(0).strip('"\'<>')
                    else:
                        endpoint_info["full_url"] = f"https://api.kie.ai{match.group(1)}"
                    endpoint_info["endpoint"] = endpoint_info["full_url"].replace('https://api.kie.ai', '')
                    break

        # Détecter la méthode si pas encore trouvée
        if not endpoint_info["method"]:
            if re.search(r'\bPOST\b', content, re.IGNORECASE):
                endpoint_info["method"] = "POST"
            elif re.search(r'\bGET\b', content, re.IGNORECASE):
                endpoint_info["method"] = "GET"

        # Extraire les modèles supportés
        model_patterns = [
            r'"model"["\']?\s*:\s*["\']([^"\']+)',
            r'"modelId"["\']?\s*:\s*["\']([^"\']+)',
            r'model_id["\']?\s*:\s*["\']([^"\']+)',
            r'Model:\s*([A-Za-z0-9\-_.]+)',
            r'model.*?options?:\s*\[([^\]]+)\]'
        ]

        for pattern in model_patterns:
            matches = re.finditer(pattern, content, re.IGNORECASE | re.DOTALL)
            for match in matches:
                model_text = match.group(1)
                # Extraire les modèles de la liste
                if '[' in model_text or ',' in model_text:
                    models = re.findall(r'["\']([^"\']+)["\']', model_text)
                    endpoint_info["modelIds"].extend(models)
                else:
                    if model_text and model_text not in endpoint_info["modelIds"]:
                        endpoint_info["modelIds"].append(model_text)

        # Dédupliquer les modèles
        endpoint_info["modelIds"] = list(set(endpoint_info["modelIds"]))

        # Extraire les paramètres depuis les tables ou les blocs de code JSON
        # Chercher les tables de paramètres
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            for row in rows[1:]:  # Skip header
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    param_name = cells[0].get_text().strip()
                    if not param_name or param_name.lower() in ['parameter', 'name', 'field']:
                        continue

                    param_info = {
                        "type": "string",
                        "description": "",
                        "options": [],
                        "default": None
                    }

                    # Type
                    if len(cells) > 1:
                        type_text = cells[1].get_text().strip().lower()
                        if 'string' in type_text:
                            param_info["type"] = "string"
                        elif 'number' in type_text or 'integer' in type_text or 'int' in type_text:
                            param_info["type"] = "number"
                        elif 'boolean' in type_text or 'bool' in type_text:
                            param_info["type"] = "boolean"
                        elif 'array' in type_text or 'list' in type_text:
                            param_info["type"] = "array"
                        elif 'object' in type_text:
                            param_info["type"] = "object"

                    # Description
                    if len(cells) > 2:
                        param_info["description"] = cells[2].get_text().strip()

                    # Required/Optional
                    is_required = False
                    if len(cells) > 3:
                        req_text = cells[3].get_text().strip().lower()
                        is_required = 'yes' in req_text or 'required' in req_text or 'true' in req_text
                    else:
                        # Chercher "required" dans la description
                        full_text = ' '.join([c.get_text() for c in cells]).lower()
                        is_required = 'required' in full_text and 'optional' not in full_text

                    # Default value
                    if len(cells) > 4:
                        default_text = cells[4].get_text().strip()
                        if default_text and default_text.lower() not in ['none', 'null', '-', '']:
                            param_info["default"] = default_text

                    # Ajouter le paramètre
                    if is_required:
                        endpoint_info["parameters"]["required"][param_name] = param_info
                    else:
                        endpoint_info["parameters"]["optional"][param_name] = param_info

        # Extraire les paramètres depuis les blocs JSON
        json_patterns = [
            r'\{[^}]*"[^"]*"[^}]*:[^}]*\}',
            r'Request Body:.*?\{.*?\}',
        ]

        for pattern in json_patterns:
            matches = re.finditer(pattern, content, re.DOTALL | re.IGNORECASE)
            for match in matches:
                try:
                    json_text = match.group(0)
                    # Nettoyer et essayer de parser
                    json_text = re.search(r'\{.*\}', json_text, re.DOTALL)
                    if json_text:
                        json_obj = json.loads(json_text.group(0))
                        for key, value in json_obj.items():
                            if key not in endpoint_info["parameters"]["required"] and key not in endpoint_info["parameters"]["optional"]:
                                param_type = "string"
                                if isinstance(value, bool):
                                    param_type = "boolean"
                                elif isinstance(value, int) or isinstance(value, float):
                                    param_type = "number"
                                elif isinstance(value, list):
                                    param_type = "array"
                                elif isinstance(value, dict):
                                    param_type = "object"

                                endpoint_info["parameters"]["optional"][key] = {
                                    "type": param_type,
                                    "description": "",
                                    "default": value if not isinstance(value, (dict, list)) else None
                                }
                except:
                    pass

        # Extraire le pricing
        pricing_patterns = [
            r'(\d+)\s*credits?',
            r'cost[s]?\s*:\s*(\d+)',
            r'price[s]?\s*:\s*(\d+)',
            r'Credits Required:\s*(\d+)',
            r'Credit Cost:\s*(\d+)'
        ]

        for pattern in pricing_patterns:
            match = re.search(pattern, content, re.IGNORECASE)
            if match:
                try:
                    endpoint_info["pricing"]["credits"] = int(match.group(1))
                    break
                except:
                    pass

        # Extraire les exemples curl
        curl_example_patterns = [
            r'(curl\s+--request\s+(?:POST|GET)[^;]+)',
            r'(curl\s+-X\s+(?:POST|GET)[^;]+)',
        ]

        for pattern in curl_example_patterns:
            matches = re.finditer(pattern, content, re.DOTALL)
            for match in matches:
                example = match.group(1).strip()
                # Nettoyer l'exemple
                example = re.sub(r'<[^>]+>', '', example)
                example = re.sub(r'\s+', ' ', example)
                if len(example) < 1000 and example not in endpoint_info["examples"]:
                    endpoint_info["examples"].append(example)

        return endpoint_info

    except Exception as e:
        print(f"Error processing {html_file}: {e}")
        return None

def main():
    """Fonction principale."""
    docskie_path = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')

    # Trouver tous les fichiers HTML
    html_files = list(docskie_path.rglob('*.html'))
    print(f"Found {len(html_files)} HTML files")

    # Extraire les informations de chaque fichier
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

    # Sauvegarder le JSON
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Extraction complete!")
    print(f"✓ Total endpoints: {len(endpoints)}")
    print(f"✓ Categories: {output['categories']}")
    print(f"✓ Output saved to: {output_file}")

if __name__ == "__main__":
    main()
