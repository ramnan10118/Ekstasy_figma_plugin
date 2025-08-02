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



// Individual processing for all text layers (more accurate than batch)
export async function checkTextLayersWithOpenAI(textLayers: TextLayer[]): Promise<TextLayer[]> {
  try {
    if (!textLayers || textLayers.length === 0) {
      console.log('No text layers to process');
      return textLayers;
    }

    console.log('Starting OpenAI INDIVIDUAL processing for', textLayers.length, 'layers');

    // Filter layers that have valid text content
    const validLayers = textLayers.filter(layer => layer.text && layer.text.trim());
    
    if (validLayers.length === 0) {
      console.log('No valid text content to process');
      return textLayers;
    }

    console.log(`Processing ${validLayers.length} text layers individually...`);
    
    // Process each text layer individually
    const processedLayers: TextLayer[] = [];
    
    for (let i = 0; i < validLayers.length; i++) {
      const layer = validLayers[i];
      console.log(`Processing ${i + 1}/${validLayers.length}: "${layer.text}" (${layer.name})`);
      
      try {
        const processedLayer = await checkSingleTextWithOpenAI(layer);
        processedLayers.push(processedLayer);
        console.log(`✓ Completed ${i + 1}/${validLayers.length}: Found ${processedLayer.issues.length} issues`);
      } catch (error) {
        console.error(`✗ Failed ${i + 1}/${validLayers.length}:`, error);
        processedLayers.push({ ...layer, issues: [] });
      }
      
      // Small delay to avoid rate limiting
      if (i < validLayers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Merge processed layers back with original layers (maintaining order)
    const finalLayers = textLayers.map(originalLayer => {
      const processedLayer = processedLayers.find(p => p.id === originalLayer.id);
      return processedLayer || { ...originalLayer, issues: [] };
    });

    console.log('=== INDIVIDUAL PROCESSING COMPLETE ===');
    console.log(`Processed ${processedLayers.length} layers individually`);
    
    const totalIssues = finalLayers.reduce((sum, layer) => sum + layer.issues.length, 0);
    console.log(`Total issues found: ${totalIssues}`);
    
    return finalLayers;

  } catch (error) {
    console.error('OpenAI individual processing failed:', error);
    return textLayers.map(layer => ({ ...layer, issues: [] }));
  }
}