#!/usr/bin/env python3
"""
Advanced parser for KIE API HTML documentation files.
Extracts endpoint information with better accuracy using BeautifulSoup.
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print("Warning: BeautifulSoup not available, using regex fallback")

def extract_with_regex(html_content: str, filename: str, full_path: str = "") -> Optional[Dict[str, Any]]:
    """Fallback extraction using regex when BeautifulSoup is not available."""

    # Get relative path from docskie folder for better categorization
    docskie_path = '/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie'
    relative_path = full_path.replace(docskie_path + '/', '') if docskie_path in full_path else filename

    endpoint_info = {
        "name": filename.replace(' - KIE API.html', '').replace('.html', ''),
        "endpoint": "",
        "method": "",
        "modelIds": [],
        "required": {},
        "optional": {},
        "pricing": {},
        "examples": [],
        "description": "",
        "source_file": relative_path,
        "category": ""
    }

    # Extract endpoint URL - look for various patterns
    url_patterns = [
        r'https://api\.kie\.ai(/api/v\d+/[^\s"\'<>]+)',
        r'"url"\s*:\s*"https://api\.kie\.ai(/api/v\d+/[^"]+)"',
        r'POST\s+https://api\.kie\.ai(/api/v\d+/[^\s"\'<>]+)',
        r'GET\s+https://api\.kie\.ai(/api/v\d+/[^\s"\'<>]+)',
    ]

    for pattern in url_patterns:
        matches = re.findall(pattern, html_content)
        if matches:
            endpoint_info["endpoint"] = matches[0] if matches[0].startswith('/') else '/' + matches[0]
            break

    # Extract HTTP method
    if re.search(r'\bPOST\b', html_content, re.IGNORECASE):
        endpoint_info["method"] = "POST"
    elif re.search(r'\bGET\b', html_content, re.IGNORECASE):
        endpoint_info["method"] = "GET"

    # Extract model IDs from JSON examples
    model_patterns = [
        r'"model[_-]?id"\s*:\s*"([^"]+)"',
        r'"model"\s*:\s*"([^"]+)"',
        r'model[_-]?id[=:]\s*["\']([^"\']+)["\']',
    ]

    model_ids = set()
    for pattern in model_patterns:
        matches = re.findall(pattern, html_content, re.IGNORECASE)
        for match in matches:
            if match and len(match) < 100:  # Sanity check
                model_ids.add(match)

    endpoint_info["modelIds"] = sorted(list(model_ids))

    # Extract pricing - look for credit costs
    credit_patterns = [
        r'(\d+)\s+credits?\s+per',
        r'costs?\s+(\d+)\s+credits?',
        r'price[:\s]+(\d+)',
        r'(\d+)\s+credits?\b',
    ]

    for pattern in credit_patterns:
        matches = re.findall(pattern, html_content, re.IGNORECASE)
        if matches:
            try:
                endpoint_info["pricing"]["credits"] = int(matches[0])
                break
            except:
                pass

    # Extract curl examples
    curl_pattern = r'curl\s+[^<]*?(?:https://api\.kie\.ai[^<]*?)(?:\s*\\|\s*-[^\n]*\n)*[^<]*?(?:\n\n|</code>|</pre>)'
    curl_matches = re.findall(curl_pattern, html_content, re.DOTALL | re.IGNORECASE)
    endpoint_info["examples"] = [match.strip()[:1000] for match in curl_matches[:2]]

    # Extract parameters from JSON request examples
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    json_matches = re.findall(json_pattern, html_content)

    params_found = {}
    for json_str in json_matches[:5]:  # Check first 5 JSON objects
        try:
            # Try to parse as JSON
            json_clean = re.sub(r'//.*', '', json_str)  # Remove comments
            data = json.loads(json_clean)

            if isinstance(data, dict):
                for key, value in data.items():
                    if key.lower() not in ['api_key', 'apikey', 'authorization']:
                        param_type = type(value).__name__
                        if param_type == 'NoneType':
                            param_type = 'string'
                        params_found[key] = param_type
        except:
            pass

    # Categorize params as required or optional based on context
    for key, ptype in params_found.items():
        # Common required params
        if key.lower() in ['prompt', 'model_id', 'model', 'task_id', 'text']:
            endpoint_info["required"][key] = ptype
        else:
            endpoint_info["optional"][key] = ptype

    # Determine category from path
    if '/gpt4o-image/' in endpoint_info["endpoint"]:
        endpoint_info["category"] = "4o-image"
    elif '/suno/' in endpoint_info["endpoint"]:
        endpoint_info["category"] = "suno"
    elif '/runway/' in endpoint_info["endpoint"]:
        endpoint_info["category"] = "runway"
    elif '/flux/' in endpoint_info["endpoint"] or 'flux' in endpoint_info["name"].lower():
        endpoint_info["category"] = "flux"
    elif '/veo/' in endpoint_info["endpoint"] or 'veo' in endpoint_info["name"].lower():
        endpoint_info["category"] = "veo"
    elif '/luma/' in endpoint_info["endpoint"]:
        endpoint_info["category"] = "luma"
    elif '/market/' in endpoint_info["endpoint"]:
        endpoint_info["category"] = "market"

    return endpoint_info

def extract_endpoint_info(html_file_path: str) -> Optional[Dict[str, Any]]:
    """Extract API endpoint information from an HTML file."""
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_file_path}: {e}")
        return None

    filename = os.path.basename(html_file_path)

    # Use regex-based extraction
    return extract_with_regex(html_content, filename, html_file_path)

def main():
    docskie_dir = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')

    all_endpoints = []

    # Find all HTML files
    html_files = list(docskie_dir.glob('**/*.html'))
    print(f"Found {len(html_files)} HTML files\n")

    for i, html_file in enumerate(sorted(html_files), 1):
        rel_path = html_file.relative_to(docskie_dir)
        print(f"[{i}/{len(html_files)}] Processing: {rel_path}")

        endpoint_info = extract_endpoint_info(str(html_file))

        if endpoint_info:
            # Only include if we found an endpoint or method
            if endpoint_info['endpoint'] or endpoint_info['method']:
                all_endpoints.append(endpoint_info)
                if endpoint_info['endpoint']:
                    print(f"    → Found: {endpoint_info['method']} {endpoint_info['endpoint']}")
                    if endpoint_info['modelIds']:
                        print(f"    → Models: {', '.join(endpoint_info['modelIds'][:3])}")

    # Group by category
    by_category = {}
    for ep in all_endpoints:
        cat = ep.get('category', 'other')
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(ep)

    # Create final JSON structure
    output_data = {
        "metadata": {
            "total_count": len(all_endpoints),
            "generated_at": "2026-01-29",
            "categories": {cat: len(eps) for cat, eps in by_category.items()}
        },
        "endpoints": all_endpoints,
        "by_category": by_category
    }

    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"Extracted {len(all_endpoints)} endpoints")
    print(f"Categories: {', '.join(sorted(by_category.keys()))}")
    print(f"Output saved to: {output_file}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
