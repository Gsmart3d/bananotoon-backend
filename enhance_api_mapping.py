#!/usr/bin/env python3
"""
Enhance the API endpoints mapping with better categorization.
"""

import json
from pathlib import Path
from typing import Dict, List

def categorize_endpoint(endpoint_info: Dict) -> str:
    """Determine the category based on endpoint path and model IDs."""
    endpoint = endpoint_info.get('endpoint', '').lower()
    name = endpoint_info.get('name', '').lower()
    models = [m.lower() for m in endpoint_info.get('modelIds', [])]
    source = endpoint_info.get('source_file', '').lower()

    # Check source file path first
    if 'runway' in source:
        if 'aleph' in name:
            return 'runway-aleph'
        return 'runway'
    elif '4oimage' in source or 'gpt4o-image' in endpoint:
        return '4o-image'
    elif 'suno' in source:
        return 'suno'
    elif 'veo3.1' in source or 'veo' in endpoint:
        return 'veo'
    elif 'luma' in source or 'luma' in endpoint:
        return 'luma'
    elif 'flux' in source or 'flux' in endpoint or any('flux' in m for m in models):
        return 'flux'

    # Market models - check models list
    if any('claude' in m for m in models):
        return 'market-chat-claude'
    elif any('gemini' in m for m in models):
        return 'market-chat-gemini'
    elif any('sora' in m for m in models):
        return 'market-video-sora'
    elif any('kling' in m for m in models):
        return 'market-video-kling'
    elif any('wan/' in m for m in models):
        return 'market-video-wan'
    elif any('bytedance' in m for m in models):
        if any('seedream' in m for m in models):
            return 'market-image-seedream'
        elif any('seedance' in m or 'v1' in m for m in models):
            return 'market-video-bytedance'
    elif any('hailuo' in m for m in models):
        return 'market-video-hailuo'
    elif any('elevenlabs' in m for m in models):
        return 'market-music-elevenlabs'
    elif any('grok-imagine' in m for m in models):
        if 'video' in name:
            return 'market-video-grok'
        return 'market-image-grok'
    elif any('topaz' in m for m in models):
        if 'video' in name:
            return 'market-video-topaz'
        return 'market-image-topaz'
    elif any('imagen' in m or 'nano-banana' in m for m in models):
        return 'market-image-google'
    elif any('gpt-image' in m for m in models):
        return 'market-image-gpt'
    elif any('ideogram' in m for m in models):
        return 'market-image-ideogram'
    elif any('qwen' in m for m in models):
        return 'market-image-qwen'
    elif any('recraft' in m for m in models):
        return 'market-image-recraft'
    elif any('infinitalk' in m for m in models):
        return 'market-video-infinitalk'
    elif any('z-image' in m for m in models):
        return 'market-image-zimage'

    # Common APIs
    if 'common' in source or '/chat/credit' in endpoint or '/common/' in endpoint:
        return 'common'
    elif 'file upload' in source or 'upload' in name.lower():
        return 'file-upload'
    elif 'callback' in name.lower() or 'webhook' in name.lower():
        return 'callbacks'
    elif 'market' in source and '/jobs/' in endpoint:
        return 'market-general'

    return 'other'

def get_capability(endpoint_info: Dict) -> str:
    """Determine the capability/type of the endpoint."""
    name = endpoint_info.get('name', '').lower()
    endpoint = endpoint_info.get('endpoint', '').lower()

    if 'text-to-image' in name or 'text to image' in name:
        return 'text-to-image'
    elif 'image-to-image' in name or 'image to image' in name:
        return 'image-to-image'
    elif 'text-to-video' in name or 'text to video' in name:
        return 'text-to-video'
    elif 'image-to-video' in name or 'image to video' in name:
        return 'image-to-video'
    elif 'video-to-video' in name or 'video to video' in name:
        return 'video-to-video'
    elif 'upscale' in name:
        return 'upscale'
    elif 'generate' in name and 'music' in name:
        return 'generate-music'
    elif 'generate' in name and 'lyrics' in name:
        return 'generate-lyrics'
    elif 'text-to-speech' in name or 'speech' in name:
        return 'text-to-speech'
    elif 'speech-to-text' in name:
        return 'speech-to-text'
    elif 'extend' in name:
        return 'extend'
    elif 'edit' in name:
        return 'edit'
    elif 'remove-background' in name:
        return 'remove-background'
    elif 'record-info' in endpoint or 'get' in name and 'details' in name:
        return 'get-status'
    elif 'download' in name or 'download' in endpoint:
        return 'get-download'
    elif 'callback' in name:
        return 'callback'
    elif 'credit' in endpoint:
        return 'get-credits'

    return 'other'

def main():
    json_file = Path('/home/gsm/AndroidStudioProjects/BananoToon/vercel-backend/api-endpoints-mapping.json')

    # Load existing data
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    endpoints = data.get('endpoints', [])

    # Enhance each endpoint
    for ep in endpoints:
        ep['category'] = categorize_endpoint(ep)
        ep['capability'] = get_capability(ep)

    # Group by category
    by_category = {}
    for ep in endpoints:
        cat = ep['category']
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(ep)

    # Update metadata
    metadata = {
        "total_count": len(endpoints),
        "generated_at": "2026-01-29",
        "by_category_count": {cat: len(eps) for cat, eps in sorted(by_category.items())},
        "unique_models": len(set(m for ep in endpoints for m in ep.get('modelIds', []))),
        "endpoints_with_models": sum(1 for ep in endpoints if ep.get('modelIds'))
    }

    # Create enhanced structure
    enhanced_data = {
        "metadata": metadata,
        "endpoints": endpoints,
        "by_category": by_category
    }

    # Save enhanced data
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(enhanced_data, f, indent=2, ensure_ascii=False)

    print(f"Enhanced {len(endpoints)} endpoints")
    print(f"\nCategories:")
    for cat, count in sorted(metadata['by_category_count'].items()):
        print(f"  {cat:30s}: {count:3d}")

if __name__ == '__main__':
    main()
