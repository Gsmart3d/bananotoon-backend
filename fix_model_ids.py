#!/usr/bin/env python3
"""
Fix empty modelIds in api-endpoints-mapping.json
Extract model names from name field or model.example field
"""
import json
import re

def extract_model_id(endpoint):
    """Extract modelId from endpoint data"""
    # Option 1: Use the name field (convert to lowercase, replace spaces with hyphens)
    name = endpoint.get('name', '')
    model_id_from_name = name.lower().replace(' ', '-').replace('_', '-')

    # Option 2: Check model.example in parameters
    model_example = None
    if 'parameters' in endpoint and 'required' in endpoint['parameters']:
        if 'model' in endpoint['parameters']['required']:
            model_example = endpoint['parameters']['required']['model'].get('example')

    # Prefer model.example if available, otherwise use name
    if model_example:
        return model_example
    elif model_id_from_name:
        return model_id_from_name
    else:
        return None

def main():
    # Load mapping
    with open('api-endpoints-mapping.json', 'r') as f:
        data = json.load(f)

    fixed_count = 0
    for endpoint in data['endpoints']:
        if not endpoint.get('modelIds') or len(endpoint.get('modelIds', [])) == 0:
            model_id = extract_model_id(endpoint)
            if model_id:
                endpoint['modelIds'] = [model_id]
                fixed_count += 1
                print(f"✅ Fixed: {endpoint['name']} -> {model_id}")

    # Save fixed mapping
    with open('api-endpoints-mapping.json', 'w') as f:
        json.dump(data, f, indent=2)

    print(f"\n🎉 Fixed {fixed_count} endpoints!")
    print(f"Total endpoints: {len(data['endpoints'])}")

if __name__ == '__main__':
    main()
