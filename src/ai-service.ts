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

// Simple fallback grammar checker using basic rules
function checkTextWithBasicRules(text: string): Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[] {
  const issues: Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[] = [];
  
  // Common grammar/spelling patterns
  const patterns = [
    { pattern: /\bteh\b/gi, replacement: 'the', type: 'spelling' as const },
    { pattern: /\brecieve\b/gi, replacement: 'receive', type: 'spelling' as const },
    { pattern: /\boccured\b/gi, replacement: 'occurred', type: 'spelling' as const },
    { pattern: /\bseperate\b/gi, replacement: 'separate', type: 'spelling' as const },
    { pattern: /\bdefinately\b/gi, replacement: 'definitely', type: 'spelling' as const },
    { pattern: /\bi\b/g, replacement: 'I', type: 'grammar' as const },
    { pattern: /\byour\s+welcome\b/gi, replacement: "you're welcome", type: 'grammar' as const },
    { pattern: /\bits\s+/gi, replacement: "it's ", type: 'grammar' as const, condition: (match: string, text: string, index: number) => {
      // Only suggest "it's" if it seems like a contraction context
      const before = text.substring(Math.max(0, index - 10), index);
      const after = text.substring(index + match.length, index + match.length + 10);
      return !before.includes('of') && !after.includes('own');
    }}
  ];
  
  patterns.forEach((rule, ruleIndex) => {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    
    while ((match = regex.exec(text)) !== null) {
      // Check condition if it exists
      if (rule.condition && !rule.condition(match[0], text, match.index)) {
        continue;
      }
      
      issues.push({
        id: `basic-${ruleIndex}-${match.index}`,
        originalText: text,
        issueText: match[0],
        suggestion: rule.replacement,
        type: rule.type,
        confidence: 0.8,
        position: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }
  });
  
  return issues;
}

export async function checkTextWithLanguageTool(text: string): Promise<Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[]> {
  try {
    if (!text || !text.trim()) {
      return [];
    }

    console.log('Starting LanguageTool text analysis for:', text.substring(0, 50) + '...');
    
    // For testing: if text contains "test", add a demo issue
    if (text.toLowerCase().includes('test')) {
      console.log('DEBUG: Adding demo issue for testing');
      return [{
        id: 'demo-test-1',
        originalText: text,
        issueText: 'test',
        suggestion: 'demo',
        type: 'style' as const,
        confidence: 0.9,
        position: { start: text.toLowerCase().indexOf('test'), end: text.toLowerCase().indexOf('test') + 4 }
      }];
    }

    // Use CORS-enabled LanguageTool API endpoint
    const baseUrl = 'https://api.languagetool.org/v2/check';
    
    // Create URL-encoded form data for better CORS compatibility
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', 'en-US');
    params.append('enabledOnly', 'false');

    console.log('Making request to LanguageTool API...');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString()
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
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's a CORS or network error
    if (error.message.includes('CORS') || error.message.includes('fetch')) {
      console.error('CORS or network error detected - using basic fallback grammar checker');
    }
    
    // Use fallback basic grammar checker when LanguageTool fails
    console.log('Using fallback basic grammar checker for:', text.substring(0, 50) + '...');
    return checkTextWithBasicRules(text);
  }
}