#!/usr/bin/env python3
"""
Utilitaire de recherche et filtrage des endpoints KIE API.
Permet de trouver rapidement des endpoints par catégorie, modèle, paramètres, etc.
"""

import json
import sys
from pathlib import Path

def load_mapping():
    """Charge le fichier de mapping JSON."""
    mapping_file = Path(__file__).parent / 'api-endpoints-mapping.json'
    with open(mapping_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def search_by_category(data, category):
    """Recherche par catégorie."""
    results = [ep for ep in data['endpoints'] if ep['category'] == category.lower()]
    return results

def search_by_model(data, model_query):
    """Recherche par modèle."""
    results = [
        ep for ep in data['endpoints']
        if any(model_query.lower() in model.lower() for model in ep['modelIds'])
    ]
    return results

def search_by_name(data, name_query):
    """Recherche par nom."""
    results = [
        ep for ep in data['endpoints']
        if name_query.lower() in ep['name'].lower()
    ]
    return results

def search_by_parameter(data, param_name):
    """Recherche par paramètre."""
    results = [
        ep for ep in data['endpoints']
        if param_name in ep['parameters']['required'] or param_name in ep['parameters']['optional']
    ]
    return results

def list_all_models(data):
    """Liste tous les modèles uniques."""
    models = set()
    for ep in data['endpoints']:
        models.update(ep['modelIds'])
    return sorted(list(models))

def list_all_parameters(data):
    """Liste tous les paramètres uniques."""
    params = set()
    for ep in data['endpoints']:
        params.update(ep['parameters']['required'].keys())
        params.update(ep['parameters']['optional'].keys())
    return sorted(list(params))

def display_endpoint(ep, detailed=False):
    """Affiche un endpoint."""
    req_count = len(ep['parameters']['required'])
    opt_count = len(ep['parameters']['optional'])
    models = ', '.join(ep['modelIds'][:2]) if ep['modelIds'] else 'generic'

    print(f"\n📌 {ep['name']}")
    print(f"   Category:  {ep['category']}")
    print(f"   Endpoint:  {ep['endpoint']}")
    print(f"   Method:    {ep['method']}")
    print(f"   Models:    {models}")
    print(f"   Params:    {req_count} required, {opt_count} optional")

    if ep['pricing']['credits']:
        print(f"   Credits:   {ep['pricing']['credits']}")

    if detailed:
        if ep['parameters']['required']:
            print(f"\n   Required Parameters:")
            for param, info in ep['parameters']['required'].items():
                example = f" (ex: {info['example']})" if info.get('example') else ""
                print(f"     - {param}: {info['type']}{example}")

        if ep['parameters']['optional']:
            print(f"\n   Optional Parameters:")
            for param, info in ep['parameters']['optional'].items():
                example = f" (ex: {info['example']})" if info.get('example') else ""
                print(f"     - {param}: {info['type']}{example}")

def main():
    """Fonction principale CLI."""
    data = load_mapping()

    if len(sys.argv) < 2:
        print("Usage: python search_endpoints.py <command> [args]")
        print("\nCommands:")
        print("  category <name>       - Search by category (image|video|audio|chat)")
        print("  model <query>         - Search by model name")
        print("  name <query>          - Search by endpoint name")
        print("  param <param_name>    - Search by parameter")
        print("  list-models           - List all unique models")
        print("  list-params           - List all unique parameters")
        print("  stats                 - Show statistics")
        print("\nExamples:")
        print("  python search_endpoints.py category video")
        print("  python search_endpoints.py model wan")
        print("  python search_endpoints.py name 'Image to Video'")
        print("  python search_endpoints.py param prompt")
        return

    command = sys.argv[1].lower()

    if command == 'stats':
        print("="*70)
        print("KIE API ENDPOINTS STATISTICS")
        print("="*70)
        print(f"\nTotal Endpoints: {data['total_endpoints']}")
        print(f"Version: {data['version']}")
        print(f"Extracted: {data['extracted_date']}")
        print(f"\nCategories:")
        for cat, count in sorted(data['categories'].items()):
            print(f"  {cat:10s} : {count:3d} endpoints")
        print(f"\nMost Common Parameters:")
        for param, count in list(data['most_common_parameters'].items())[:15]:
            print(f"  {param:20s} : {count:3d} endpoints")

    elif command == 'category':
        if len(sys.argv) < 3:
            print("Error: Please specify a category (image|video|audio|chat|other)")
            return
        category = sys.argv[2]
        results = search_by_category(data, category)
        print(f"\n Found {len(results)} endpoints in category '{category}':\n")
        for ep in results:
            display_endpoint(ep)

    elif command == 'model':
        if len(sys.argv) < 3:
            print("Error: Please specify a model query")
            return
        query = sys.argv[2]
        results = search_by_model(data, query)
        print(f"\n Found {len(results)} endpoints with model matching '{query}':\n")
        for ep in results:
            display_endpoint(ep, detailed=True)

    elif command == 'name':
        if len(sys.argv) < 3:
            print("Error: Please specify a name query")
            return
        query = ' '.join(sys.argv[2:])
        results = search_by_name(data, query)
        print(f"\n Found {len(results)} endpoints matching '{query}':\n")
        for ep in results:
            display_endpoint(ep, detailed=True)

    elif command == 'param':
        if len(sys.argv) < 3:
            print("Error: Please specify a parameter name")
            return
        param = sys.argv[2]
        results = search_by_parameter(data, param)
        print(f"\n Found {len(results)} endpoints with parameter '{param}':\n")
        for ep in results[:10]:  # Limit to 10
            display_endpoint(ep)
        if len(results) > 10:
            print(f"\n   ... and {len(results) - 10} more")

    elif command == 'list-models':
        models = list_all_models(data)
        print(f"\n Found {len(models)} unique models:\n")
        for i, model in enumerate(models, 1):
            print(f"  {i:3d}. {model}")

    elif command == 'list-params':
        params = list_all_parameters(data)
        print(f"\n Found {len(params)} unique parameters:\n")
        for i, param in enumerate(params, 1):
            print(f"  {i:3d}. {param}")

    else:
        print(f"Unknown command: {command}")
        print("Run without arguments to see usage.")

if __name__ == "__main__":
    main()
