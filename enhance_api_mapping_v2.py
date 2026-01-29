#!/usr/bin/env python3
"""
Enhanced categorization for API endpoints mapping.
"""

import json
from pathlib import Path
from typing import Dict

def categorize_endpoint(endpoint_info: Dict) -> str:
    """Determine the category based on endpoint path, model IDs, and name."""
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
    elif 'luma' in source or 'luma' in endpoint or '/modify/' in endpoint:
        return 'luma'
    elif 'flux' in source or '/flux/' in endpoint or any('flux' in m for m in models):
        return 'flux'

    # Check by name patterns for market models
    if 'claude' in name:
        return 'market-chat-claude'
    elif 'gemini' in name:
        return 'market-chat-gemini'
    elif 'sora' in name or any('sora' in m for m in models):
        return 'market-video-sora'
    elif 'kling' in name or any('kling' in m for m in models):
        return 'market-video-kling'
    elif 'wan' in name or any('wan/' in m for m in models):
        return 'market-video-wan'
    elif 'hailuo' in name or any('hailuo' in m for m in models):
        return 'market-video-hailuo'
    elif 'seedream' in name or any('seedream' in m for m in models):
        return 'market-image-seedream'
    elif 'seedance' in name or any('seedance' in m for m in models):
        return 'market-video-bytedance'
    elif 'bytedance' in name or any('bytedance' in m for m in models):
        if 'video' in name or 'v1' in str(models):
            return 'market-video-bytedance'
        return 'market-image-bytedance'
    elif 'elevenlabs' in name or any('elevenlabs' in m for m in models):
        return 'market-music-elevenlabs'
    elif 'grok' in name or any('grok' in m for m in models):
        if 'video' in name:
            return 'market-video-grok'
        return 'market-image-grok'
    elif 'topaz' in name or any('topaz' in m for m in models):
        if 'video' in name:
            return 'market-video-topaz'
        return 'market-image-topaz'
    elif 'imagen' in name or 'nano-banana' in name or any('imagen' in m or 'nano-banana' in m for m in models):
        return 'market-image-google'
    elif 'gpt image' in name or 'gpt-image' in name or any('gpt-image' in m for m in models):
        return 'market-image-gpt'
    elif 'ideogram' in name or any('ideogram' in m for m in models):
        return 'market-image-ideogram'
    elif 'qwen' in name or any('qwen' in m for m in models):
        return 'market-image-qwen'
    elif 'recraft' in name or any('recraft' in m for m in models):
        return 'market-image-recraft'
    elif 'infinitalk' in name or any('infinitalk' in m for m in models):
        return 'market-video-infinitalk'
    elif 'z-image' in name or any('z-image' in m for m in models):
        return 'market-image-zimage'
    elif any('flux-2' in m for m in models):
        return 'market-image-flux2'

    # Common APIs
    if 'common' in source or '/chat/credit' in endpoint or '/common/' in endpoint:
        return 'common'
    elif 'file upload' in source or ('upload' in name.lower() and 'file' in source):
        return 'file-upload'
    elif 'callback' in name.lower() or 'webhook' in name.lower():
        return 'callbacks'
    elif 'getting started' in name or 'quickstart' in name:
        return 'documentation'
    elif 'market' in source and '/jobs/' in endpoint:
        return 'market-general'

    return 'other'

def get_capability(endpoint_info: Dict) -> str:
    """Determine the capability/type of the endpoint."""
    name = endpoint_info.get('name', '').lower()
    endpoint = endpoint_info.get('endpoint', '').lower()
    models = [m.lower() for m in endpoint_info.get('modelIds', [])]

    # Check models first for more accurate detection
    if any('text-to-image' in m for m in models):
        return 'text-to-image'
    elif any('image-to-image' in m for m in models):
        return 'image-to-image'
    elif any('text-to-video' in m for m in models):
        return 'text-to-video'
    elif any('image-to-video' in m for m in models):
        return 'image-to-video'

    # Check name
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
    elif 'speech-to-video' in name or 'audio' in name and 'video' in name:
        return 'audio-to-video'
    elif 'upscale' in name:
        return 'upscale'
    elif 'motion-control' in name or 'animate' in name:
        return 'motion-control'
    elif 'character' in name and not 'edit' in name:
        return 'character-generation'
    elif 'reframe' in name:
        return 'reframe'
    elif ('generate' in name or 'create' in name) and 'music' in name:
        return 'generate-music'
    elif ('generate' in name or 'create' in name) and 'lyrics' in name:
        return 'generate-lyrics'
    elif 'text-to-speech' in name or 'tts' in name:
        return 'text-to-speech'
    elif 'text-to-dialogue' in name:
        return 'text-to-dialogue'
    elif 'speech-to-text' in name or 'stt' in name:
        return 'speech-to-text'
    elif 'sound-effect' in name or 'audio-isolation' in name:
        return 'audio-effect'
    elif 'extend' in name:
        return 'extend'
    elif 'edit' in name or 'modify' in name:
        return 'edit'
    elif 'cover' in name:
        return 'cover'
    elif 'remix' in name:
        return 'remix'
    elif 'remove-background' in name or 'background' in name:
        return 'remove-background'
    elif 'watermark' in name:
        return 'remove-watermark'
    elif 'midi' in name:
        return 'audio-to-midi'
    elif 'wav' in name:
        return 'audio-convert'
    elif 'vocal' in name or 'stem' in name or 'separation' in name:
        return 'audio-separation'
    elif 'record-info' in endpoint or ('get' in name and 'details' in name):
        return 'get-status'
    elif 'download' in name or 'download' in endpoint:
        return 'get-download'
    elif 'callback' in name:
        return 'callback'
    elif 'credit' in endpoint or 'credit' in name:
        return 'get-credits'
    elif 'webhook' in name:
        return 'webhook'
    elif 'chat' in name or any('claude' in m or 'gemini' in m for m in models):
        return 'chat'

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
    by_capability = {}
    for ep in endpoints:
        cat = ep['category']
        cap = ep['capability']

        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(ep)

        if cap not in by_capability:
            by_capability[cap] = []
        by_capability[cap].append(ep)

    # Collect all unique model IDs
    all_models = sorted(set(m for ep in endpoints for m in ep.get('modelIds', [])))

    # Update metadata
    metadata = {
        "total_count": len(endpoints),
        "generated_at": "2026-01-29",
        "by_category_count": {cat: len(eps) for cat, eps in sorted(by_category.items())},
        "by_capability_count": {cap: len(eps) for cap, eps in sorted(by_capability.items())},
        "unique_models": len(all_models),
        "endpoints_with_models": sum(1 for ep in endpoints if ep.get('modelIds')),
        "all_model_ids": all_models
    }

    # Create enhanced structure
    enhanced_data = {
        "metadata": metadata,
        "endpoints": endpoints,
        "by_category": by_category,
        "by_capability": by_capability
    }

    # Save enhanced data
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(enhanced_data, f, indent=2, ensure_ascii=False)

    print(f"Enhanced {len(endpoints)} endpoints")
    print(f"\n{'='*60}")
    print(f"Categories: {len(by_category)}")
    for cat, count in sorted(metadata['by_category_count'].items()):
        print(f"  {cat:35s}: {count:3d}")

    print(f"\n{'='*60}")
    print(f"Capabilities: {len(by_capability)}")
    for cap, count in sorted(metadata['by_capability_count'].items(), key=lambda x: -x[1])[:15]:
        print(f"  {cap:35s}: {count:3d}")

    print(f"\n{'='*60}")
    print(f"Total unique model IDs: {len(all_models)}")

if __name__ == '__main__':
    main()
