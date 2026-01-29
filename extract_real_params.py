#!/usr/bin/env python3
"""
Script ultra-précis pour extraire les VRAIS paramètres des APIs depuis les fichiers HTML.
Filtre tout le bruit JavaScript et ne garde que les paramètres d'API réels.
"""

import json
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Liste des paramètres d'API courants à chercher
VALID_API_PARAMS = {
    'model', 'modelId', 'prompt', 'image', 'video', 'audio', 'text', 'input',
    'width', 'height', 'duration', 'resolution', 'aspect_ratio', 'aspectRatio',
    'quality', 'style', 'seed', 'steps', 'guidance_scale', 'negative_prompt',
    'num_outputs', 'num_images', 'scheduler', 'format', 'fps', 'loop',
    'webhook_url', 'webhook', 'callback', 'taskId', 'task_id',
    'temperature', 'top_p', 'max_tokens', 'stream', 'messages',
    'voice', 'language', 'speed', 'pitch', 'volume',
    'start_time', 'end_time', 'extend_audio', 'instrumental',
    'lyrics', 'make_instrumental', 'mv_style', 'custom_mode',
    'cfg_scale', 'motion_speed', 'camera_control', 'motion_control',
    'image_url', 'video_url', 'audio_url', 'file_url', 'url',
    'strength', 'init_image', 'mask', 'inpaint', 'outpaint',
    'upscale_factor', 'enhance', 'creativity', 'similarity',
    'character_prompt', 'background_prompt', 'animation_type',
    'consistency', 'safe_mode', 'nsfw_filter', 'watermark'
}

def extract_params_from_html(html_file):
    """Extrait les vrais paramètres d'API depuis un fichier HTML."""
    try:
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            # Lire seulement les premiers 500KB (partie de contenu)
            content = f.read(500000)

        params_found = {}
        models_found = set()

        # Chercher les paramètres JSON dans le contenu
        # Pattern: "param_name": "value" ou "param_name": value
        json_param_pattern = r'"([a-z_][a-z0-9_]*)"[\\s\n]*:[\\s\n]*([^,}\]]+)'
        matches = re.finditer(json_param_pattern, content, re.IGNORECASE)

        for match in matches:
            param_name = match.group(1).strip()
            param_value = match.group(2).strip().strip('"\'')

            # Vérifier si c'est un vrai paramètre d'API
            if param_name in VALID_API_PARAMS or param_name.lower() in VALID_API_PARAMS:
                # Déterminer le type
                param_type = "string"
                example = param_value[:100]

                if param_value.lower() in ['true', 'false']:
                    param_type = "boolean"
                    example = param_value.lower() == 'true'
                elif param_value.isdigit() or re.match(r'^\d+\.?\d*$', param_value):
                    param_type = "number"
                    try:
                        example = float(param_value) if '.' in param_value else int(param_value)
                    except:
                        example = param_value
                elif param_value.startswith('['):
                    param_type = "array"
                    example = None
                elif param_value.startswith('{'):
                    param_type = "object"
                    example = None

                if param_name not in params_found:
                    params_found[param_name] = {
                        "type": param_type,
                        "example": example,
                        "description": ""
                    }

            # Collecter les modèles
            if param_name == 'model' and '/' in param_value:
                models_found.add(param_value)

        return params_found, list(models_found)

    except Exception as e:
        print(f"Error: {e}")
        return {}, []

def categorize_file(file_path):
    """Détermine la catégorie du fichier."""
    path_lower = str(file_path).lower()

    if 'suno' in path_lower or 'elevenlabs' in path_lower or '/music' in path_lower:
        return 'audio'
    elif 'runway' in path_lower or 'luma' in path_lower or 'veo' in path_lower or 'kling' in path_lower or 'wan' in path_lower or 'sora' in path_lower or 'hailuo' in path_lower or 'bytedance' in path_lower or 'infinitalk' in path_lower or '/video' in path_lower:
        return 'video'
    elif '4oimage' in path_lower or 'flux' in path_lower or 'grok' in path_lower or 'ideogram' in path_lower or 'seedream' in path_lower or 'recraft' in path_lower or 'qwen' in path_lower or '/image' in path_lower or 'topaz' in path_lower:
        return 'image'
    elif 'claude' in path_lower or 'gemini' in path_lower or '/chat' in path_lower:
        return 'chat'
    else:
        return 'other'

def extract_endpoint_url(content, file_name):
    """Extrait l'URL de l'endpoint."""
    # Chercher les URLs d'API
    api_urls = re.findall(r'https://api\.kie\.ai(/api/v\d+/[a-zA-Z0-9/_-]+)', content)

    if api_urls:
        # Filtrer et prendre la première URL valide
        for url_path in api_urls:
            if 'jobs/createTask' in url_path or 'generate' in url_path or 'suno' in url_path or 'aleph' in url_path:
                return f"https://api.kie.ai{url_path}", url_path

    return None, None

def main():
    """Fonction principale."""
    docskie_path = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')

    print("="*70)
    print("KIE API Real Parameters Extractor")
    print("="*70 + "\n")

    # Trouver tous les HTML
    html_files = list(docskie_path.rglob('*.html'))
    print(f"Found {len(html_files)} HTML files\n")

    all_endpoints = []
    category_stats = defaultdict(int)
    param_stats = defaultdict(int)

    for i, html_file in enumerate(html_files, 1):
        print(f"[{i:3d}/{len(html_files)}] {html_file.name[:65]:<65}", end=" ")

        # Lire le fichier
        try:
            with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(500000)  # Premiers 500KB
        except:
            print("✗ error")
            continue

        # Extraire le titre
        title_match = re.search(r'<title[^>]*>(.*?)</title>', content, re.IGNORECASE)
        name = "Unknown"
        if title_match:
            name = re.sub(r'<[^>]+>', '', title_match.group(1))
            name = name.replace(' - KIE API', '').replace('KIE API', '').strip()

        # Catégorie
        category = categorize_file(html_file)

        # Endpoint URL
        full_url, endpoint = extract_endpoint_url(content, html_file.name)

        # Skip si pas d'endpoint trouvé
        if not endpoint:
            print("✗ no endpoint")
            continue

        # Méthode
        method = "POST"  # Par défaut
        if re.search(r'--request\s+GET|"GET"', content, re.IGNORECASE):
            method = "GET"

        # Paramètres
        params, models = extract_params_from_html(html_file)

        # Credits
        credits_matches = re.findall(r'(\d+)\s*credits?', content, re.IGNORECASE)
        credits = None
        if credits_matches:
            valid_credits = [int(c) for c in credits_matches if 1 <= int(c) <= 10000]
            if valid_credits:
                credits = min(valid_credits)

        # Créer l'endpoint info
        endpoint_info = {
            "name": name,
            "category": category,
            "endpoint": endpoint,
            "full_url": full_url,
            "method": method,
            "modelIds": models,
            "parameters": {
                "required": {},
                "optional": {}
            },
            "pricing": {
                "credits": credits
            }
        }

        # Classer les paramètres
        required_params = ['model', 'prompt', 'text', 'input', 'image']
        for param_name, param_info in params.items():
            if param_name in required_params:
                endpoint_info["parameters"]["required"][param_name] = param_info
            else:
                endpoint_info["parameters"]["optional"][param_name] = param_info

        all_endpoints.append(endpoint_info)
        category_stats[category] += 1

        param_count = len(params)
        for p in params:
            param_stats[p] += 1

        print(f"✓ ({param_count} params, {len(models)} models)")

    # Créer le JSON final
    output = {
        "version": "2.0.0",
        "extracted_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "description": "Complete mapping of KIE API endpoints with real parameters extracted from HTML documentation",
        "total_endpoints": len(all_endpoints),
        "categories": dict(category_stats),
        "most_common_parameters": dict(sorted(param_stats.items(), key=lambda x: x[1], reverse=True)[:20]),
        "endpoints": all_endpoints
    }

    # Sauvegarder
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    # Statistiques
    total_params = sum(len(e["parameters"]["required"]) + len(e["parameters"]["optional"]) for e in all_endpoints)
    endpoints_with_models = sum(1 for e in all_endpoints if e["modelIds"])
    endpoints_with_pricing = sum(1 for e in all_endpoints if e["pricing"]["credits"])

    print(f"\n{'='*70}")
    print(f"✓ Extraction Complete!")
    print(f"{'='*70}")
    print(f"Total endpoints:              {len(all_endpoints)}")
    print(f"Total unique parameters:      {total_params}")
    print(f"Endpoints with models:        {endpoints_with_models}")
    print(f"Endpoints with pricing:       {endpoints_with_pricing}")
    print(f"Categories:                   {dict(category_stats)}")
    print(f"Output file:                  {output_file}")
    print(f"{'='*70}\n")

    # Top paramètres
    print("Most common parameters:")
    for param, count in sorted(param_stats.items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f"  {param:20s} : {count:3d} endpoints")

    # Exemples
    print(f"\n{'='*70}")
    print("Sample Endpoints:\n")
    for i, ep in enumerate(all_endpoints[:5], 1):
        req_count = len(ep["parameters"]["required"])
        opt_count = len(ep["parameters"]["optional"])
        models_str = ", ".join(ep["modelIds"][:2]) if ep["modelIds"] else "N/A"

        print(f"{i}. {ep['name']}")
        print(f"   Category:  {ep['category']}")
        print(f"   Endpoint:  {ep['endpoint']}")
        print(f"   Method:    {ep['method']}")
        print(f"   Models:    {models_str}")
        print(f"   Params:    {req_count} required, {opt_count} optional")
        if ep['pricing']['credits']:
            print(f"   Credits:   {ep['pricing']['credits']}")
        if ep["parameters"]["required"] or ep["parameters"]["optional"]:
            all_params = list(ep["parameters"]["required"].keys()) + list(ep["parameters"]["optional"].keys())
            print(f"   Fields:    {', '.join(all_params[:5])}")
        print()

if __name__ == "__main__":
    main()
