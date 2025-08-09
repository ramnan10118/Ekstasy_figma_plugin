import { TextIssue, TextLayer } from './types';
import { TextNormalizer, NormalizedText } from './text-normalizer';
import { grammarCache, CacheEntry } from './cache-manager';

// Individual text processing for more accurate results
export async function checkSingleTextWithOpenAI(textLayer: TextLayer): Promise<TextLayer> {
  try {
    if (!textLayer.text || !textLayer.text.trim()) {
      console.log('No text content to process for layer:', textLayer.name);
      return { ...textLayer, issues: [] };
    }

    console.log(`Processing individual text: "${textLayer.text}" (${textLayer.name})`);

    // Create focused system prompt for individual text analysis
    const systemPrompt = `Grammar+spelling checker. ONLY flag REAL errors - if text is correct, return {"issues":[]}.

EXAMPLES - DO NOT flag these (they're correct):
✅ "Added to your account" ✅ "Welcome bonus" ✅ "Car insurance"

EXAMPLES - DO flag these (they have errors):  
❌ "Addded to you're account" → "Added to your account"
❌ "Welcom bonus" → "Welcome bonus"

CRITICAL: 
- "suggestion" field = ACTUAL corrected text to replace the error
- "position" field = EXACT character positions with start and end indices
- Position example: In "Hello wrold", "wrold" is at positions start:6, end:11

Keep {placeholders}, numbers, URLs as-is. Be conservative - only flag obvious errors.

{"issues":[{"originalText":"","issueText":"","suggestion":"ACTUAL_CORRECTED_TEXT","type":"grammar|spelling","confidence":0.9,"position":{"start":START_INDEX,"end":END_INDEX}}]}`;

    const userPrompt = `Analyze this text for grammar and spelling errors: "${textLayer.text}"`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    console.log('Making individual OpenAI API request...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error for individual text:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result: OpenAIResponse = await response.json();
    console.log('Individual OpenAI API response received');

    const aiContent = result.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from OpenAI for individual text');
    }

    console.log(`Raw OpenAI response for "${textLayer.text}":`, aiContent);

    // Parse JSON response
    let grammarResult: { issues: Array<any> };
    try {
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      grammarResult = JSON.parse(cleanedContent);
      
      // 🔍 DEBUG: Log position data from AI
      if (grammarResult.issues && grammarResult.issues.length > 0) {
        grammarResult.issues.forEach((issue, index) => {
          console.log(`🔍 DEBUG Issue ${index + 1}:`);
          console.log(`   Text: "${textLayer.text}"`);
          console.log(`   Issue: "${issue.issueText}" → "${issue.suggestion}"`);
          console.log(`   AI Position: start=${issue.position?.start}, end=${issue.position?.end}`);
          console.log(`   Expected: "${textLayer.text.substring(issue.position?.start || 0, issue.position?.end || 0)}"`);
        });
      }
    } catch (parseError) {
      console.error('Failed to parse individual OpenAI JSON response:', parseError);
      console.error('Raw content:', aiContent);
      throw new Error('Invalid JSON response from OpenAI for individual text');
    }

    // Convert results to our TextIssue format
    const issues: TextIssue[] = (grammarResult.issues || [])
      .filter((issue) => {
        // Filter out style errors and invalid suggestions
        if (issue.type === 'style') {
          console.log('Filtered out style error:', issue.issueText, '→', issue.suggestion);
          return false;
        }
        
        const suggestion = issue.suggestion || '';
        const issueText = issue.issueText || '';
        const originalText = issue.originalText || '';
        
        // Enhanced filtering for false positives
        
        // 1. Skip invalid suggestions (existing logic)
        const suggestionLower = suggestion.toLowerCase();
        if (suggestionLower.includes('(mock correction)') || 
            suggestionLower.includes('(corrected)') || 
            suggestionLower.includes('[correction]') ||
            suggestionLower.includes('placeholder') ||
            suggestionLower.includes('mock')) {
          console.log('Filtered out invalid suggestion format:', suggestion);
          return false;
        }
        
        // 2. Skip if suggestion is identical to issue text (no real correction) - CASE SENSITIVE
        if (suggestion === issueText) {
          console.log('Filtered out identical suggestion:', issueText, '=', suggestion);
          return false;
        }
        
        // 3. Skip if suggestion is identical to original text (false positive) - CASE SENSITIVE
        if (suggestion === originalText) {
          console.log('Filtered out false positive - suggestion matches original:', originalText);
          return false;
        }
        
        // 4. Skip very short "corrections" that are likely false positives
        if (issueText.length < 2 && suggestion.length < 2) {
          console.log('Filtered out trivial correction:', issueText, '→', suggestion);
          return false;
        }
        
        return true;
      })
      .map((issue, index) => ({
        id: `individual-${textLayer.id}-${index}`,
        layerId: textLayer.id,
        layerName: textLayer.name,
        originalText: issue.originalText || textLayer.text,
        issueText: issue.issueText,
        suggestion: issue.suggestion,
        type: issue.type,
        confidence: issue.confidence || 0.9,
        position: issue.position || { start: 0, end: issue.issueText?.length || 0 },
        status: 'pending' as const
      }));

    console.log(`Found ${issues.length} issues in "${textLayer.text}"`);
    return { ...textLayer, issues };

  } catch (error) {
    console.error('Individual text processing failed for:', textLayer.name, error);
    return { ...textLayer, issues: [] };
  }
}


// OpenAI API interfaces
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OpenAIGrammarResult {
  [layerId: string]: {
    issues: Array<{
      originalText: string;
      issueText: string;
      suggestion: string;
      type: 'grammar' | 'spelling' | 'style';
      confidence: number;
      position: {
        start: number;
        end: number;
      };
    }>;
  };
}



// Main OpenAI processing function with caching
export async function checkTextLayersWithOpenAI(
  textLayers: TextLayer[], 
  onProgress?: (completed: number, total: number) => void,
  onIssueFound?: (layerId: string, issues: TextIssue[]) => void
): Promise<TextLayer[]> {
  try {
    if (!textLayers || textLayers.length === 0) {
      console.log('No text layers to process');
      return textLayers;
    }

    console.log('Starting OpenAI processing with CACHING for', textLayers.length, 'layers');

    // Filter layers that have valid text content
    const validLayers = textLayers.filter(layer => 
      layer.text && layer.text.trim() && TextNormalizer.isValidForChecking(layer.text)
    );
    
    if (validLayers.length === 0) {
      console.log('No valid text content to process');
      return textLayers;
    }

    console.log(`Found ${validLayers.length} valid text layers to process`);

    // Group layers by normalized text to eliminate duplicates
    const normalizedGroups = TextNormalizer.groupLayersByNormalizedText(
      validLayers.map(layer => ({ id: layer.id, text: layer.text }))
    );

    console.log(`🔄 DEDUPLICATION: Grouped ${validLayers.length} layers into ${normalizedGroups.size} unique texts`);
    console.log(`📊 DEDUPLICATION RATIO: ${((validLayers.length - normalizedGroups.size) / validLayers.length * 100).toFixed(1)}%`);
    
    // Debug: Show some examples of grouping
    let groupCount = 0;
    for (const [normalizedText, group] of normalizedGroups) {
      if (group.layerIds.length > 1 && groupCount < 5) {
        console.log(`🔗 GROUPED: "${normalizedText}" appears in ${group.layerIds.length} layers`);
        groupCount++;
      }
    }

    // Check cache for each normalized text
    const cacheResults = new Map<string, CacheEntry>();
    const textsToProcess: NormalizedText[] = [];
    
    for (const [normalizedText, group] of normalizedGroups) {
      grammarCache.mapLayersToNormalizedText(normalizedText, group.layerIds);
      
      const cachedEntry = grammarCache.getCachedResult(normalizedText);
      
      if (cachedEntry && cachedEntry.status === 'HIT') {
        console.log(`🎯 CACHE HIT: "${normalizedText}" (${group.layerIds.length} layers)`);
        cacheResults.set(normalizedText, cachedEntry);
        
        // 🚀 STREAMING: Emit cached results immediately
        if (onIssueFound) {
          group.layerIds.forEach(layerId => {
            const originalLayer = validLayers.find(layer => layer.id === layerId);
            if (originalLayer) {
              const issues: TextIssue[] = cachedEntry.result.map((issue, index) => ({
                id: `${layerId}-${index}`,
                layerId: layerId,
                layerName: originalLayer.name,
                originalText: issue.originalText || originalLayer.text,
                issueText: issue.issueText,
                suggestion: issue.suggestion,
                type: issue.type,
                confidence: issue.confidence,
                position: issue.position || { start: 0, end: issue.issueText?.length || 0 },
                status: 'pending' as const
              }));
              
              console.log(`🎯 STREAMING: Emitting ${issues.length} cached issues for layer "${originalLayer.name}"`);
              onIssueFound(layerId, issues);
            }
          });
        }
      } else {
        if (cachedEntry && cachedEntry.status === 'STALE') {
          console.log(`⚠️  CACHE STALE: "${normalizedText}" - will refresh`);
        } else {
          console.log(`🔍 CACHE MISS: "${normalizedText}" - will process`);
        }
        textsToProcess.push(group);
      }
    }

    const processedResults = new Map<string, CacheEntry['result']>();
    
    // Process only unique texts that need API calls
    if (textsToProcess.length > 0) {
      console.log(`\n=== Processing ${textsToProcess.length} unique texts via OpenAI ===`);
      
      // Configuration for parallel processing
      const CONCURRENT_REQUESTS = 4;
      const DELAY_BETWEEN_BATCHES = 200;
      
      // Split unique texts into batches for parallel processing
      const batches: NormalizedText[][] = [];
      for (let i = 0; i < textsToProcess.length; i += CONCURRENT_REQUESTS) {
        batches.push(textsToProcess.slice(i, i + CONCURRENT_REQUESTS));
      }
      
      let totalProcessed = 0;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\nBatch ${batchIndex + 1}/${batches.length} (${batch.length} unique texts)`);
        
        const batchPromises = batch.map(async (group, indexInBatch) => {
          const globalIndex = totalProcessed + indexInBatch + 1;
          console.log(`🔄 Processing ${globalIndex}/${textsToProcess.length}: "${group.normalized}" (affects ${group.layerIds.length} layers)`);
          
          try {
            // Create a temporary layer for processing
            const tempLayer: TextLayer = {
              id: group.layerIds[0], // Use first layer ID as reference
              name: `temp-${group.layerIds[0]}`,
              text: group.original,
              issues: []
            };
            
            const processedLayer = await checkSingleTextWithOpenAI(tempLayer);
            const result = processedLayer.issues.map(issue => ({
              originalText: issue.originalText,
              issueText: issue.issueText,
              suggestion: issue.suggestion,
              type: issue.type,
              confidence: issue.confidence,
              position: { start: issue.position.start, end: issue.position.end }
            }));
            
            // Cache the result
            grammarCache.setCachedResult(group.normalized, result);
            console.log(`✅ Completed ${globalIndex}/${textsToProcess.length}: Found ${result.length} issues, cached for reuse`);
            
            return { normalizedText: group.normalized, result };
          } catch (error) {
            console.error(`❌ Failed ${globalIndex}/${textsToProcess.length}:`, error);
            return { normalizedText: group.normalized, result: [] };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ normalizedText, result }) => {
          processedResults.set(normalizedText, result);
        });
        
        // 🚀 STREAMING: Emit results immediately after batch completion
        if (onIssueFound) {
          batchResults.forEach(({ normalizedText, result }) => {
            // Find all layers that use this normalized text
            const group = normalizedGroups.get(normalizedText);
            if (group) {
              // Convert abbreviated format back to TextIssue format for each layer
              group.layerIds.forEach(layerId => {
                const originalLayer = validLayers.find(layer => layer.id === layerId);
                if (originalLayer) {
                  const issues: TextIssue[] = result.map((issue, index) => ({
                    id: `${layerId}-${index}`,
                    layerId: layerId,
                    layerName: originalLayer.name,
                    originalText: issue.originalText || originalLayer.text,
                    issueText: issue.issueText,
                    suggestion: issue.suggestion,
                    type: issue.type,
                    confidence: issue.confidence,
                    position: issue.position || { start: 0, end: issue.issueText?.length || 0 },
                    status: 'pending' as const
                  }));
                  
                  console.log(`🔄 STREAMING: Emitting ${issues.length} issues for layer "${originalLayer.name}"`);
                  onIssueFound(layerId, issues);
                }
              });
            }
          });
        }
        
        totalProcessed += batch.length;
        
        if (onProgress) {
          const totalExpected = normalizedGroups.size;
          const completed = cacheResults.size + totalProcessed;
          onProgress(completed, totalExpected);
        }
        
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
      }
    }

    // Map results back to all layers
    const finalLayers = textLayers.map(originalLayer => {
      if (!originalLayer.text || !originalLayer.text.trim() || !TextNormalizer.isValidForChecking(originalLayer.text)) {
        return { ...originalLayer, issues: [] };
      }
      
      const normalizedText = TextNormalizer.normalize(originalLayer.text);
      
      // Get result from cache or processed results
      let rawResult: CacheEntry['result'] = [];
      const cachedEntry = cacheResults.get(normalizedText);
      if (cachedEntry) {
        rawResult = cachedEntry.result;
      } else {
        rawResult = processedResults.get(normalizedText) || [];
      }
      
      // Convert format back to TextIssue format
      const issues: TextIssue[] = rawResult.map((issue, index) => ({
        id: `${originalLayer.id}-${index}`,
        layerId: originalLayer.id,
        layerName: originalLayer.name,
        originalText: issue.originalText || originalLayer.text,
        issueText: issue.issueText,
        suggestion: issue.suggestion,
        type: issue.type,
        confidence: issue.confidence,
        position: issue.position || { start: 0, end: issue.issueText?.length || 0 },
        status: 'pending' as const
      }));
      
      return { ...originalLayer, issues };
    });

    // Log final statistics
    console.log('\n=== CACHED PROCESSING COMPLETE ===');
    grammarCache.logCacheStats();
    
    const uniqueTextsProcessed = textsToProcess.length;
    const totalTextsDeduped = validLayers.length - uniqueTextsProcessed;
    const totalIssues = finalLayers.reduce((sum, layer) => sum + layer.issues.length, 0);
    
    console.log(`Processed ${uniqueTextsProcessed} unique texts via OpenAI`);
    console.log(`Reused ${totalTextsDeduped} results from deduplication/cache`);
    console.log(`Total issues found: ${totalIssues} across ${finalLayers.length} layers`);
    
    return finalLayers;

  } catch (error) {
    console.error('Cached OpenAI processing failed:', error);
    return textLayers.map(layer => ({ ...layer, issues: [] }));
  }
}