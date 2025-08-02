import { TextIssue, TextLayer } from './types';

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

interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: Array<{
    value: string;
  }>;
  rule: {
    id: string;
    category: {
      id: string;
      name: string;
    };
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

// Optimized OpenAI batch processing for all text layers
export async function checkTextLayersWithOpenAI(textLayers: TextLayer[]): Promise<TextLayer[]> {
  try {
    if (!textLayers || textLayers.length === 0) {
      console.log('No text layers to process');
      return textLayers;
    }

    console.log('Starting OpenAI batch processing for', textLayers.length, 'layers');

    // Prepare batch data for OpenAI
    const batchData: Record<string, string> = {};
    textLayers.forEach(layer => {
      if (layer.text && layer.text.trim()) {
        batchData[layer.id] = layer.text;
      }
    });

    if (Object.keys(batchData).length === 0) {
      console.log('No valid text content to process');
      return textLayers;
    }

    // Create system prompt for grammar checking
    const systemPrompt = `You are a professional grammar and spell checker. Analyze the provided text layers and identify ALL grammar, spelling, and style errors.

For each layer, return ONLY errors found, with precise character positions. Return valid JSON in this exact format:

{
  "layer_id": {
    "issues": [
      {
        "originalText": "full original text of the layer",
        "issueText": "the problematic text portion",
        "suggestion": "corrected version",
        "type": "grammar|spelling|style",
        "confidence": 0.9,
        "position": {
          "start": 0,
          "end": 5
        }
      }
    ]
  }
}

IMPORTANT:
- Include ALL errors, even minor ones
- Provide complete, grammatically correct suggestions
- Be precise with character positions (0-indexed)
- If no errors in a layer, return empty issues array
- Return only valid JSON, no explanations`;

    const userPrompt = `Check these text layers for grammar, spelling, and style errors:\n\n${JSON.stringify(batchData, null, 2)}`;

    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    console.log('Making OpenAI API request...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result: OpenAIResponse = await response.json();
    console.log('OpenAI API response received');

    const aiContent = result.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from OpenAI');
    }

    console.log('Raw OpenAI response:', aiContent);

    // Parse JSON response
    let grammarResults: OpenAIGrammarResult;
    try {
      // Clean up potential JSON formatting issues
      const cleanedContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      grammarResults = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', parseError);
      console.error('Raw content:', aiContent);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Convert OpenAI results to our TextIssue format
    const updatedLayers = textLayers.map(layer => {
      const layerResults = grammarResults[layer.id];
      if (!layerResults || !layerResults.issues) {
        return { ...layer, issues: [] };
      }

      const issues: TextIssue[] = layerResults.issues.map((issue, index) => ({
        id: `openai-${layer.id}-${index}`,
        layerId: layer.id,
        layerName: layer.name,
        originalText: issue.originalText,
        issueText: issue.issueText,
        suggestion: issue.suggestion,
        type: issue.type,
        confidence: issue.confidence,
        position: issue.position,
        status: 'pending' as const
      }));

      return { ...layer, issues };
    });

    console.log('Processed', updatedLayers.length, 'layers with OpenAI results');
    return updatedLayers;

  } catch (error) {
    console.error('OpenAI batch processing failed:', error);
    
    // Fallback to LanguageTool for individual layers
    console.log('Falling back to LanguageTool processing...');
    const fallbackLayers = await Promise.all(
      textLayers.map(async (layer) => {
        if (!layer.text || !layer.text.trim()) {
          return { ...layer, issues: [] };
        }
        
        try {
          const fallbackIssues = await checkTextWithLanguageTool(layer.text);
          const issues: TextIssue[] = fallbackIssues.map((issue, index) => ({
            ...issue,
            id: `fallback-${layer.id}-${index}`,
            layerId: layer.id,
            layerName: layer.name,
            status: 'pending' as const
          }));
          return { ...layer, issues };
        } catch (fallbackError) {
          console.error('Fallback also failed for layer', layer.id, fallbackError);
          return { ...layer, issues: [] };
        }
      })
    );
    
    return fallbackLayers;
  }
}

export async function checkTextWithLanguageTool(text: string): Promise<Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[]> {
  try {
    if (!text || !text.trim()) {
      return [];
    }

    const baseUrl = 'https://api.languagetool.org/v2/check';
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');
    params.append('enabledOnly', 'false');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`);
    }

    const data: LanguageToolResponse = await response.json();
    
    if (!data.matches || data.matches.length === 0) {
      return [];
    }

    const issues = data.matches
      .filter((match) => {
        if (match.replacements.length === 0) return false;
        
        const issueText = text.substring(match.offset, match.offset + match.length);
        const suggestion = match.replacements[0].value;
        
        if (issueText === suggestion) return false;
        if (/^\d[\d,.\s]*$/.test(issueText.trim())) return false;
        if (!suggestion || !suggestion.trim()) return false;
        
        return true;
      })
      .map((match, index) => {
        const issueText = text.substring(match.offset, match.offset + match.length);
        const suggestion = match.replacements[0].value;
        
        let issueType: 'grammar' | 'spelling' | 'style' = 'grammar';
        if (match.rule.category.id === 'TYPOS') {
          issueType = 'spelling';
        } else if (match.rule.category.id === 'STYLE') {
          issueType = 'style';
        }

        return {
          id: `lt-${match.rule.id}-${index}`,
          originalText: text,
          issueText: issueText,
          suggestion: suggestion,
          type: issueType,
          confidence: 0.9,
          position: {
            start: match.offset,
            end: match.offset + match.length
          }
        };
      });

    return issues;

  } catch (error) {
    console.error('LanguageTool failed:', error);
    return [];
  }
}