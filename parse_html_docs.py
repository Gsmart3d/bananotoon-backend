#!/usr/bin/env python3
"""
Parser for KIE API HTML documentation files.
Extracts endpoint information including URL, method, parameters, pricing, and examples.
"""

import os
import json
import re
from pathlib import Path
from html.parser import HTMLParser
from typing import Dict, List, Any, Optional

class KieApiHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.endpoints = []
        self.current_text = []
        self.in_code = False
        self.in_pre = False
        self.all_text = []
        self.code_blocks = []
        self.current_code = []

    def handle_starttag(self, tag, attrs):
        if tag == 'code':
            self.in_code = True
            self.current_code = []
        elif tag == 'pre':
            self.in_pre = True

    def handle_endtag(self, tag):
        if tag == 'code':
            self.in_code = False
            if self.current_code:
                self.code_blocks.append(''.join(self.current_code))
        elif tag == 'pre':
            self.in_pre = False

    def handle_data(self, data):
        if self.in_code or self.in_pre:
            self.current_code.append(data)
        self.all_text.append(data)

def extract_endpoint_info(html_file_path: str) -> Optional[Dict[str, Any]]:
    """Extract API endpoint information from an HTML file."""
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except Exception as e:
        print(f"Error reading {html_file_path}: {e}")
        return None

    parser = KieApiHTMLParser()
    parser.feed(html_content)

    full_text = ' '.join(parser.all_text)
    code_blocks = parser.code_blocks

    endpoint_info = {
        "name": "",
        "endpoint": "",
        "method": "",
        "modelIds": [],
        "required": {},
        "optional": {},
        "pricing": {},
        "examples": [],
        "description": "",
        "source_file": os.path.basename(html_file_path)
    }

    # Extract name from filename
    filename = os.path.basename(html_file_path).replace(' - KIE API.html', '').replace('.html', '')
    endpoint_info["name"] = filename

    # Extract endpoint URL
    url_patterns = [
        r'https://api\.kie\.ai/api/v\d+/[^\s"\'\)]+',
        r'/api/v\d+/[^\s"\'\)]+',
        r'POST\s+(https://[^\s]+)',
        r'GET\s+(https://[^\s]+)',
    ]

    for pattern in url_patterns:
        matches = re.findall(pattern, full_text)
        if matches:
            endpoint_info["endpoint"] = matches[0]
            break

    # Extract HTTP method
    if 'POST' in full_text.upper():
        endpoint_info["method"] = "POST"
    elif 'GET' in full_text.upper():
        endpoint_info["method"] = "GET"

    # Extract model IDs
    model_id_patterns = [
        r'"model[_-]?id"\s*:\s*"([^"]+)"',
        r'"model"\s*:\s*"([^"]+)"',
        r'model[_-]?id[:\s]+([a-zA-Z0-9\-_.]+)',
    ]

    for pattern in model_id_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            endpoint_info["modelIds"].extend(matches)

    # Extract pricing/credits
    credit_patterns = [
        r'(\d+)\s*credit',
        r'cost[:\s]+(\d+)',
        r'price[:\s]+(\d+)',
        r'(\d+)\s*credits?',
    ]

    for pattern in credit_patterns:
        matches = re.findall(pattern, full_text, re.IGNORECASE)
        if matches:
            endpoint_info["pricing"]["credits"] = int(matches[0])
            break

    # Extract curl examples
    curl_examples = []
    for code_block in code_blocks:
        if 'curl' in code_block.lower():
            curl_examples.append(code_block.strip())

    endpoint_info["examples"] = curl_examples[:3]  # Keep first 3 examples

    # Extract parameters from code blocks (JSON)
    for code_block in code_blocks:
        if '{' in code_block and '}' in code_block:
            try:
                # Try to parse as JSON
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', code_block, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                    try:
                        data = json.loads(json_str)
                        # Extract parameters from JSON
                        for key, value in data.items():
                            if key not in ['api_key', 'apiKey']:
                                param_type = type(value).__name__
                                if 'optional' in full_text.lower() and key in full_text.lower():
                                    endpoint_info["optional"][key] = param_type
                                else:
                                    endpoint_info["required"][key] = param_type
                    except:
                        pass
            except:
                pass

    # Extract description
    desc_match = re.search(r'(?:Description|Overview|Introduction)[:\s]+([^\.]+\.)', full_text, re.IGNORECASE)
    if desc_match:
        endpoint_info["description"] = desc_match.group(1).strip()

    return endpoint_info

def main():
    docskie_dir = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')
    output_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')

    all_endpoints = []

    # Find all HTML files
    html_files = list(docskie_dir.glob('**/*.html'))
    print(f"Found {len(html_files)} HTML files")

    for html_file in sorted(html_files):
        print(f"Processing: {html_file.relative_to(docskie_dir)}")
        endpoint_info = extract_endpoint_info(str(html_file))
        if endpoint_info and (endpoint_info['endpoint'] or endpoint_info['method']):
            all_endpoints.append(endpoint_info)

    # Create final JSON structure
    output_data = {
        "endpoints": all_endpoints,
        "total_count": len(all_endpoints),
        "generated_at": "2026-01-29"
    }

    # Write to JSON file
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\nExtracted {len(all_endpoints)} endpoints")
    print(f"Output saved to: {output_file}")

if __name__ == '__main__':
    main()
