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
    const systemPrompt = `You are a professional grammar and spell checker. Analyze the following single text for ALL grammar, spelling, and punctuation errors.

CRITICAL REQUIREMENTS:
- Find EVERY spelling mistake, no matter how obvious (e.g., "Dsh" should be "Dash", "chking" should be "checking")
- Find EVERY grammar error (subject-verb agreement, tense errors, etc.)
- Find EVERY punctuation error (missing commas, periods, apostrophes, capitalization)
- DO NOT flag style issues - only real grammar, spelling, and punctuation mistakes
- Even simple typos MUST be detected and reported
- Be thorough and consistent

Return valid JSON in this exact format:
{
  "issues": [
    {
      "originalText": "full original text",
      "issueText": "the problematic word/phrase",
      "suggestion": "corrected version",
      "type": "grammar|spelling|punctuation", 
      "confidence": 0.9,
      "position": {
        "start": 0,
        "end": 5
      }
    }
  ]
}

IMPORTANT:
- Return empty array ONLY if text is genuinely perfect
- NEVER use placeholder corrections like "(corrected)" or "[fixed]"
- Be precise with character positions (0-indexed)
- Suggestions must be real words, not placeholders`;

    const userPrompt = `Analyze this text for grammar, spelling, and punctuation errors: "${textLayer.text}"`;

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
        
        const suggestion = issue.suggestion?.toLowerCase() || '';
        const issueText = issue.issueText?.toLowerCase() || '';
        
        // Skip invalid suggestions
        if (suggestion.includes('(mock correction)') || 
            suggestion.includes('(corrected)') || 
            suggestion.includes('[correction]') ||
            suggestion.includes('placeholder') ||
            suggestion.includes('mock') ||
            suggestion === issueText) {
          console.log('Filtered out invalid suggestion:', suggestion);
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



// Main OpenAI processing function with caching and deduplication
export async function checkTextLayersWithOpenAI(
  textLayers: TextLayer[], 
  onProgress?: (completed: number, total: number) => void
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
      } else {
        if (cachedEntry && cachedEntry.status === 'STALE') {
          console.log(`⚠️  CACHE STALE: "${normalizedText}" - will refresh`);
        } else {
          console.log(`🔍 CACHE MISS: "${normalizedText}" - will process`);
        }
        textsToProcess.push(group);
      }
    }

    const processedResults = new Map<string, TextIssue[]>();
    
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
            
            // Cache the result
            grammarCache.setCachedResult(group.normalized, processedLayer.issues);
            console.log(`✅ Completed ${globalIndex}/${textsToProcess.length}: Found ${processedLayer.issues.length} issues, cached for reuse`);
            
            return { normalizedText: group.normalized, result: processedLayer.issues };
          } catch (error) {
            console.error(`❌ Failed ${globalIndex}/${textsToProcess.length}:`, error);
            return { normalizedText: group.normalized, result: [] };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ normalizedText, result }) => {
          processedResults.set(normalizedText, result);
        });
        
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
      let rawResult: TextIssue[] = [];
      const cachedEntry = cacheResults.get(normalizedText);
      if (cachedEntry) {
        rawResult = cachedEntry.result;
      } else {
        rawResult = processedResults.get(normalizedText) || [];
      }
      
      // Map issues to this specific layer
      const issues: TextIssue[] = rawResult.map((issue, index) => ({
        ...issue,
        id: `${originalLayer.id}-${index}`,
        layerId: originalLayer.id,
        layerName: originalLayer.name
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