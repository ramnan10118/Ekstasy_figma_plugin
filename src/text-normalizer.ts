export interface NormalizedText {
  normalized: string;
  original: string;
  layerIds: string[];
}

export class TextNormalizer {
  
  /**
   * Normalizes text for consistent cache key generation
   */
  static normalize(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text
      .trim()                           // Remove leading/trailing whitespace
      .replace(/\s+/g, ' ')            // Normalize multiple spaces to single space
      .normalize('NFKC');              // Unicode normalization (canonical composition)
  }

  /**
   * Generates a deterministic cache key using simple hash
   */
  static generateCacheKey(
    normalizedText: string, 
    locale: string = 'en-US',
    model: string = 'gpt-4o-mini',
    promptVersion: string = '1.0',
    rulesetVersion: string = '1.0'
  ): string {
    const keyData = `${normalizedText}|${locale}|${model}|${promptVersion}|${rulesetVersion}`;
    
    // Simple hash function for browser compatibility
    let hash = 0;
    for (let i = 0; i < keyData.length; i++) {
      const char = keyData.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Groups text layers by their normalized text
   */
  static groupLayersByNormalizedText(layers: Array<{ id: string; text: string }>): Map<string, NormalizedText> {
    const groups = new Map<string, NormalizedText>();
    
    for (const layer of layers) {
      const normalized = this.normalize(layer.text);
      
      if (!normalized) {
        continue; // Skip empty/invalid text
      }
      
      const existing = groups.get(normalized);
      if (existing) {
        existing.layerIds.push(layer.id);
      } else {
        groups.set(normalized, {
          normalized,
          original: layer.text, // Use first occurrence as original
          layerIds: [layer.id]
        });
      }
    }
    
    return groups;
  }

  /**
   * Validates if text content has meaningful content for grammar checking
   */
  static isValidForChecking(text: string): boolean {
    const normalized = this.normalize(text);
    
    // Skip if empty or too short
    if (!normalized || normalized.length < 2) {
      return false;
    }
    
    // Skip if only contains numbers, symbols, or single characters
    if (/^[\d\s\W]+$/.test(normalized) && normalized.length < 3) {
      return false;
    }
    
    return true;
  }
}