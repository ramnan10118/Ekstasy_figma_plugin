import { TextIssue } from './types';

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

export async function checkTextWithLanguageTool(text: string): Promise<Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[]> {
  try {
    if (!text || !text.trim()) {
      return [];
    }

    console.log('Starting LanguageTool text analysis for:', text.substring(0, 50) + '...');

    // LanguageTool public API endpoint
    const url = 'https://api.languagetool.org/v2/check';
    
    const formData = new FormData();
    formData.append('text', text);
    formData.append('language', 'en-US');
    formData.append('enabledOnly', 'false');

    console.log('Making request to LanguageTool API...');

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LanguageTool API error response:', errorText);
      throw new Error(`LanguageTool API error: ${response.status} - ${errorText}`);
    }

    const data: LanguageToolResponse = await response.json();
    console.log('LanguageTool API response received:', data);
    
    if (!data.matches || data.matches.length === 0) {
      console.log('No grammar/spelling issues found');
      return [];
    }

    console.log('Processing', data.matches.length, 'matches from LanguageTool');

    // Convert LanguageTool matches to our TextIssue format
    const issues = data.matches.map((match, index) => {
      const issueText = text.substring(match.offset, match.offset + match.length);
      const suggestion = match.replacements.length > 0 ? match.replacements[0].value : issueText;
      
      // Determine issue type based on rule category
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
        confidence: 0.9, // LanguageTool is generally very accurate
        position: {
          start: match.offset,
          end: match.offset + match.length
        }
      };
    });

    console.log('Converted to', issues.length, 'text issues');
    return issues;

  } catch (error) {
    console.error('LanguageTool text analysis failed:', error);
    
    // Return empty array on error - no fallback needed
    return [];
  }
}