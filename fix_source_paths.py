#!/usr/bin/env python3
"""
Fix source_file paths in the JSON to include full relative paths.
"""

import json
from pathlib import Path

def main():
    json_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')
    docskie_dir = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/docskie')

    # Load existing data
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    endpoints = data.get('endpoints', [])

    # Create mapping of filename to full path
    filename_to_path = {}
    for html_file in docskie_dir.glob('**/*.html'):
        filename = html_file.name
        relative_path = str(html_file.relative_to(docskie_dir))
        filename_to_path[filename] = relative_path

    # Update each endpoint
    updated_count = 0
    for ep in endpoints:
        old_source = ep.get('source_file', '')
        if old_source in filename_to_path:
            new_source = filename_to_path[old_source]
            if new_source != old_source:
                ep['source_file'] = new_source
                updated_count += 1

    # Save updated data
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Updated {updated_count} source file paths")
    print(f"Total endpoints: {len(endpoints)}")

if __name__ == '__main__':
    main()
