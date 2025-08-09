import { TextNormalizer } from './text-normalizer';

export type CacheStatus = 'HIT' | 'MISS' | 'STALE';

export interface CacheEntry {
  status: CacheStatus;
  input: string;
  result: Array<{
    originalText: string;
    issueText: string;  
    suggestion: string;
    type: string;
    confidence: number;
    position: { start: number; end: number };
  }>;
  meta: {
    model: string;
    promptVersion: string;
    rulesetVersion: string;
    locale: string;
    createdAt: number;
    lastUsedAt: number;
  };
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  cacheSize: number;
  tokensSaved: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private reverseIndex = new Map<string, Set<string>>(); // normKey -> Set of layerIds
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    cacheSize: 0,
    tokensSaved: 0
  };

  // Configuration
  private readonly maxCacheSize = 10000;
  private readonly maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly currentPromptVersion = '2.0'; // Updated for abbreviated format
  private readonly currentRulesetVersion = '1.0';

  /**
   * Gets cached result for normalized text
   */
  getCachedResult(
    normalizedText: string,
    locale: string = 'en-US',
    model: string = 'gpt-4o-mini'
  ): CacheEntry | null {
    this.stats.totalRequests++;
    
    const cacheKey = TextNormalizer.generateCacheKey(
      normalizedText, 
      locale, 
      model, 
      this.currentPromptVersion,
      this.currentRulesetVersion
    );
    
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
    
    // Check if entry is stale
    const now = Date.now();
    const isStale = 
      entry.meta.promptVersion !== this.currentPromptVersion ||
      entry.meta.rulesetVersion !== this.currentRulesetVersion ||
      entry.meta.model !== model ||
      entry.meta.locale !== locale ||
      (now - entry.meta.createdAt) > this.maxCacheAge;
    
    if (isStale) {
      entry.status = 'STALE';
      this.stats.misses++;
      this.updateHitRate();
      return entry; // Return stale entry so caller can decide what to do
    }
    
    // Update last used time and return fresh entry
    entry.meta.lastUsedAt = now;
    entry.status = 'HIT';
    this.stats.hits++;
    
    // Estimate tokens saved (approximate)
    this.stats.tokensSaved += this.estimateTokensSaved(normalizedText);
    
    this.updateHitRate();
    return entry;
  }

  /**
   * Stores result in cache
   */
  setCachedResult(
    normalizedText: string,
    result: CacheEntry['result'],
    locale: string = 'en-US',
    model: string = 'gpt-4o-mini'
  ): void {
    const cacheKey = TextNormalizer.generateCacheKey(
      normalizedText,
      locale,
      model,
      this.currentPromptVersion,
      this.currentRulesetVersion
    );
    
    const now = Date.now();
    const entry: CacheEntry = {
      status: 'HIT',
      input: normalizedText,
      result: result,
      meta: {
        model,
        promptVersion: this.currentPromptVersion,
        rulesetVersion: this.currentRulesetVersion,
        locale,
        createdAt: now,
        lastUsedAt: now
      }
    };
    
    this.cache.set(cacheKey, entry);
    this.stats.cacheSize = this.cache.size;
    
    // Cleanup if cache is too large
    if (this.cache.size > this.maxCacheSize) {
      this.evictOldEntries();
    }
  }

  /**
   * Maps layer IDs to normalized text for reverse lookups
   */
  mapLayersToNormalizedText(normalizedText: string, layerIds: string[]): void {
    if (!this.reverseIndex.has(normalizedText)) {
      this.reverseIndex.set(normalizedText, new Set());
    }
    
    const layerSet = this.reverseIndex.get(normalizedText)!;
    layerIds.forEach(id => layerSet.add(id));
  }

  /**
   * Gets layer IDs associated with normalized text
   */
  getLayersForNormalizedText(normalizedText: string): string[] {
    const layerSet = this.reverseIndex.get(normalizedText);
    return layerSet ? Array.from(layerSet) : [];
  }

  /**
   * Invalidates cache entries (e.g., when model/prompt changes)
   */
  invalidateStaleEntries(): void {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.meta.promptVersion !== this.currentPromptVersion ||
          entry.meta.rulesetVersion !== this.currentRulesetVersion) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    this.stats.cacheSize = this.cache.size;
    console.log(`Invalidated ${removed} stale cache entries`);
  }

  /**
   * Manually clears all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.reverseIndex.clear();
    this.stats.cacheSize = 0;
    console.log('Cache cleared manually');
  }

  /**
   * Gets current cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Logs cache performance summary
   */
  logCacheStats(): void {
    const stats = this.getStats();
    console.log('\n=== CACHE PERFORMANCE ===');
    console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(1)}% (${stats.hits}/${stats.totalRequests})`);
    console.log(`Cache Size: ${stats.cacheSize} entries`);
    console.log(`Estimated Tokens Saved: ~${stats.tokensSaved}`);
    console.log('========================\n');
  }

  private updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
  }

  private estimateTokensSaved(text: string): number {
    // Rough estimation: system prompt (~80 tokens) + user prompt + text length
    // This is saved per cache hit since we don't make the API call
    const systemPromptTokens = 80;
    const userPromptTokens = 10;
    const textTokens = Math.ceil(text.length / 4); // Rough token estimation
    return systemPromptTokens + userPromptTokens + textTokens;
  }

  private evictOldEntries(): void {
    // Remove oldest 20% of entries based on lastUsedAt
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.meta.lastUsedAt - b.meta.lastUsedAt);
    
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    this.stats.cacheSize = this.cache.size;
    console.log(`Evicted ${toRemove} old cache entries`);
  }
}

// Global cache instance
export const grammarCache = new CacheManager();