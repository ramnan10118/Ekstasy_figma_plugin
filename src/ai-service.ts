import { TextIssue, TextLayer } from './types';

// Individual text processing for more accurate results
export async function checkSingleTextWithOpenAI(textLayer: TextLayer): Promise<TextLayer> {
  try {
    if (!textLayer.text || !textLayer.text.trim()) {
      console.log('No text content to process for layer:', textLayer.name);
      return { ...textLayer, issues: [] };
    }

    console.log(`Processing individual text: "${textLayer.text}" (${textLayer.name})`);

    // Create focused system prompt for individual text analysis
    const systemPrompt = `You are a professional grammar and spell checker. Analyze the following single text for ALL grammar and spelling errors.

CRITICAL REQUIREMENTS:
- Find EVERY spelling mistake, no matter how obvious (e.g., "Dsh" should be "Dash", "chking" should be "checking")
- Find EVERY grammar error (subject-verb agreement, tense errors, etc.)
- DO NOT flag style issues - only real grammar and spelling mistakes
- Even simple typos MUST be detected and reported
- Be thorough and consistent

Return valid JSON in this exact format:
{
  "issues": [
    {
      "originalText": "full original text",
      "issueText": "the problematic word/phrase",
      "suggestion": "corrected version",
      "type": "grammar|spelling", 
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



// Main OpenAI processing function
export async function checkTextLayersWithOpenAI(
  textLayers: TextLayer[], 
  onProgress?: (completed: number, total: number) => void
): Promise<TextLayer[]> {
  try {
    if (!textLayers || textLayers.length === 0) {
      console.log('No text layers to process');
      return textLayers;
    }

    // Configuration for parallel processing
    const CONCURRENT_REQUESTS = 4; // Process 4 texts simultaneously
    const DELAY_BETWEEN_BATCHES = 200; // 200ms delay between batches to respect rate limits

    console.log('Starting OpenAI PARALLEL processing for', textLayers.length, 'layers');
    console.log(`Using ${CONCURRENT_REQUESTS} concurrent requests`);

    // Filter layers that have valid text content
    const validLayers = textLayers.filter(layer => layer.text && layer.text.trim());
    
    if (validLayers.length === 0) {
      console.log('No valid text content to process');
      return textLayers;
    }

    console.log(`Processing ${validLayers.length} text layers in parallel batches...`);
    
    // Split layers into batches for parallel processing
    const batches: TextLayer[][] = [];
    for (let i = 0; i < validLayers.length; i += CONCURRENT_REQUESTS) {
      batches.push(validLayers.slice(i, i + CONCURRENT_REQUESTS));
    }

    console.log(`Created ${batches.length} batches of ${CONCURRENT_REQUESTS} texts each`);
    
    const processedLayers: TextLayer[] = [];
    let totalProcessed = 0;
    
    // Process batches sequentially, but texts within each batch in parallel
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n=== Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} texts) ===`);
      
      try {
        // Process all texts in this batch simultaneously
        const batchPromises = batch.map(async (layer, indexInBatch) => {
          const globalIndex = totalProcessed + indexInBatch + 1;
          console.log(`🔄 Starting ${globalIndex}/${validLayers.length}: "${layer.text}" (${layer.name})`);
          
          try {
            const processedLayer = await checkSingleTextWithOpenAI(layer);
            console.log(`✅ Completed ${globalIndex}/${validLayers.length}: Found ${processedLayer.issues.length} issues`);
            return processedLayer;
          } catch (error) {
            console.error(`❌ Failed ${globalIndex}/${validLayers.length}:`, error);
            return { ...layer, issues: [] };
          }
        });

        // Wait for all texts in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        processedLayers.push(...batchResults);
        totalProcessed += batch.length;

        console.log(`✓ Batch ${batchIndex + 1}/${batches.length} complete (${totalProcessed}/${validLayers.length} total)`);
        
        // Send progress update
        if (onProgress) {
          onProgress(totalProcessed, validLayers.length);
        }
        
        // Delay between batches to respect rate limits (except for the last batch)
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
        
      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} failed:`, error);
        // Add failed layers with empty issues
        batch.forEach(layer => processedLayers.push({ ...layer, issues: [] }));
        totalProcessed += batch.length;
      }
    }

    // Merge processed layers back with original layers (maintaining order)
    const finalLayers = textLayers.map(originalLayer => {
      const processedLayer = processedLayers.find(p => p.id === originalLayer.id);
      return processedLayer || { ...originalLayer, issues: [] };
    });

    console.log('\n=== PARALLEL PROCESSING COMPLETE ===');
    console.log(`Processed ${processedLayers.length} layers with ${CONCURRENT_REQUESTS} concurrent requests`);
    
    const totalIssues = finalLayers.reduce((sum, layer) => sum + layer.issues.length, 0);
    console.log(`Total issues found: ${totalIssues}`);
    
    return finalLayers;

  } catch (error) {
    console.error('OpenAI parallel processing failed:', error);
    return textLayers.map(layer => ({ ...layer, issues: [] }));
  }
}