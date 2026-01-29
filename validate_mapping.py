#!/usr/bin/env python3
"""
Script de validation du fichier api-endpoints-mapping.json.
Vérifie la qualité et la cohérence des données extraites.
"""

import json
from pathlib import Path
from collections import defaultdict

def load_mapping():
    """Charge le fichier JSON."""
    with open('api-endpoints-mapping.json', 'r') as f:
        return json.load(f)

def validate_mapping(data):
    """Valide le mapping et retourne un rapport."""
    issues = []
    warnings = []
    stats = defaultdict(int)

    print("="*70)
    print("VALIDATION DU MAPPING API ENDPOINTS")
    print("="*70)

    # Vérifications globales
    stats['total_endpoints'] = len(data['endpoints'])

    print(f"\nTotal endpoints: {stats['total_endpoints']}")
    print(f"Version: {data['version']}")
    print(f"Date: {data['extracted_date']}")

    # Validation de chaque endpoint
    for i, ep in enumerate(data['endpoints'], 1):
        # Vérifier les champs obligatoires
        if not ep.get('name'):
            issues.append(f"Endpoint #{i}: Nom manquant")
        if not ep.get('endpoint'):
            issues.append(f"Endpoint #{i} ({ep.get('name')}): URL manquante")
        if not ep.get('method'):
            issues.append(f"Endpoint #{i} ({ep.get('name')}): Méthode HTTP manquante")

        # Statistiques
        if ep.get('modelIds'):
            stats['with_models'] += 1
        if ep.get('pricing', {}).get('credits'):
            stats['with_pricing'] += 1

        req_params = len(ep.get('parameters', {}).get('required', {}))
        opt_params = len(ep.get('parameters', {}).get('optional', {}))
        total_params = req_params + opt_params

        stats['total_params'] += total_params

        if total_params == 0:
            warnings.append(f"Endpoint '{ep.get('name')}': Aucun paramètre")

        if total_params > 0:
            stats['with_params'] += 1

        # Vérifier la qualité des paramètres
        for param_name, param_info in ep.get('parameters', {}).get('required', {}).items():
            if not param_info.get('type'):
                warnings.append(f"Endpoint '{ep.get('name')}': Paramètre '{param_name}' sans type")

    # Rapport
    print(f"\n{'='*70}")
    print("STATISTIQUES")
    print(f"{'='*70}")
    print(f"Endpoints avec modèles:        {stats['with_models']:3d} / {stats['total_endpoints']:3d} ({stats['with_models']/stats['total_endpoints']*100:.1f}%)")
    print(f"Endpoints avec pricing:        {stats['with_pricing']:3d} / {stats['total_endpoints']:3d} ({stats['with_pricing']/stats['total_endpoints']*100:.1f}%)")
    print(f"Endpoints avec paramètres:     {stats['with_params']:3d} / {stats['total_endpoints']:3d} ({stats['with_params']/stats['total_endpoints']*100:.1f}%)")
    print(f"Total paramètres extraits:     {stats['total_params']}")
    print(f"Moyenne paramètres/endpoint:   {stats['total_params']/stats['total_endpoints']:.1f}")

    # Afficher les problèmes
    print(f"\n{'='*70}")
    print("PROBLÈMES CRITIQUES")
    print(f"{'='*70}")
    if issues:
        for issue in issues:
            print(f"❌ {issue}")
    else:
        print("✅ Aucun problème critique")

    print(f"\n{'='*70}")
    print("AVERTISSEMENTS")
    print(f"{'='*70}")
    if warnings:
        for warning in warnings[:20]:  # Limiter à 20
            print(f"⚠️  {warning}")
        if len(warnings) > 20:
            print(f"\n... et {len(warnings)-20} autres avertissements")
    else:
        print("✅ Aucun avertissement")

    # Qualité globale
    print(f"\n{'='*70}")
    print("SCORE DE QUALITÉ")
    print(f"{'='*70}")

    quality_score = 0
    max_score = 100

    # Critères de qualité
    if len(issues) == 0:
        quality_score += 30
        print("✅ Structure valide: +30 points")
    else:
        print(f"❌ Structure invalide: {len(issues)} problèmes")

    models_ratio = stats['with_models'] / stats['total_endpoints']
    if models_ratio > 0.4:
        quality_score += 20
        print(f"✅ Modèles bien documentés ({models_ratio*100:.0f}%): +20 points")
    else:
        print(f"⚠️  Peu de modèles documentés ({models_ratio*100:.0f}%): +{int(models_ratio*20)} points")
        quality_score += int(models_ratio * 20)

    params_ratio = stats['with_params'] / stats['total_endpoints']
    if params_ratio > 0.5:
        quality_score += 30
        print(f"✅ Paramètres bien extraits ({params_ratio*100:.0f}%): +30 points")
    else:
        print(f"⚠️  Extraction partielle des paramètres ({params_ratio*100:.0f}%): +{int(params_ratio*30)} points")
        quality_score += int(params_ratio * 30)

    if len(warnings) < 50:
        quality_score += 20
        print(f"✅ Peu d'avertissements ({len(warnings)}): +20 points")
    else:
        print(f"⚠️  Nombreux avertissements ({len(warnings)}): +{max(0, 20 - len(warnings)//10)} points")
        quality_score += max(0, 20 - len(warnings)//10)

    print(f"\n{'='*70}")
    print(f"SCORE FINAL: {quality_score}/{max_score}")
    if quality_score >= 90:
        grade = "A+ (Excellent)"
    elif quality_score >= 80:
        grade = "A (Très bon)"
    elif quality_score >= 70:
        grade = "B (Bon)"
    elif quality_score >= 60:
        grade = "C (Acceptable)"
    else:
        grade = "D (À améliorer)"

    print(f"NOTE: {grade}")
    print(f"{'='*70}\n")

    return len(issues) == 0

if __name__ == "__main__":
    data = load_mapping()
    is_valid = validate_mapping(data)
    exit(0 if is_valid else 1)
