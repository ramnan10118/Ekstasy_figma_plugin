import { TextIssue } from './types';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AIIssue {
  id: string;
  originalText: string;
  issueText: string;
  suggestion: string;
  type: 'grammar' | 'spelling' | 'style';
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

interface BatchTextInput {
  id: string;
  text: string;
  layerId: string;
  layerName: string;
}

interface BatchIssueResult {
  textId: string;
  issues: Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[];
}

export async function checkTextBatchWithAI(textInputs: BatchTextInput[]): Promise<BatchIssueResult[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (textInputs.length === 0) {
      return [];
    }

    console.log('Starting AI batch text analysis for', textInputs.length, 'texts');

    // Create batch prompt with multiple texts
    const textsForPrompt = textInputs.map((input, index) => 
      `Text ${index + 1} (ID: ${input.id}): "${input.text}"`
    ).join('\n\n');

    const prompt = `Analyze the following texts for grammar, spelling, and style issues. Return a JSON object with results for each text.

For each text that has issues, provide:
- textId: the ID from the input (e.g., "text-1", "text-2")
- issues: array of issues found in that specific text

For each issue, provide:
- id: unique identifier
- originalText: the full original text for that specific text
- issueText: the specific part that has the issue
- suggestion: corrected version of the issue
- type: 'grammar', 'spelling', or 'style'
- confidence: number between 0 and 1
- position: start and end character positions of the issue within that text

Texts to analyze:
${textsForPrompt}

Return format: {"results": [{"textId": "text-1", "issues": [...]}, {"textId": "text-2", "issues": [...]}, ...]}

If a text has no issues, you can omit it from the results or include it with an empty issues array.`;

    console.log('Making batch request to OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful grammar and style checker. Always respond with valid JSON only - no markdown formatting, no code blocks, no backticks. Process multiple texts efficiently in a single response.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    console.log('Batch response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    console.log('OpenAI batch API response received');
    
    const content = data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!content) {
      console.log('No content in batch response');
      return [];
    }

    console.log('AI batch response content:', content);

    try {
      // Clean the content to remove markdown formatting
      let cleanContent = content.trim();
      
      // Remove code block markers if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '');
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '');
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.replace(/\s*```$/, '');
      }
      
      console.log('Cleaned content for parsing:', cleanContent);
      
      const parsed = JSON.parse(cleanContent);
      const results = parsed.results || [];
      
      console.log('Parsed batch results:', results.length, 'texts processed');
      
      // Convert results to expected format
      const batchResults: BatchIssueResult[] = textInputs.map(input => {
        const textResult = results.find((r: any) => r.textId === input.id);
        const issues = textResult?.issues || [];
        
        return {
          textId: input.id,
          issues: issues.map((issue: any) => ({
            id: issue.id || Math.random().toString(36).substr(2, 9),
            originalText: issue.originalText || input.text,
            issueText: issue.issueText || '',
            suggestion: issue.suggestion || '',
            type: issue.type || 'grammar',
            confidence: issue.confidence || 0.8,
            position: issue.position || { start: 0, end: input.text.length }
          }))
        };
      });
      
      console.log('Final processed batch results:', batchResults);
      return batchResults;
      
    } catch (parseError) {
      console.error('Failed to parse AI batch response:', parseError);
      console.error('Raw content was:', content);
      return [];
    }

  } catch (error) {
    console.error('AI batch text analysis failed:', error);
    
    // Return empty results for all inputs on error
    return textInputs.map(input => ({
      textId: input.id,
      issues: []
    }));
  }
}

export async function checkTextWithAI(text: string): Promise<Omit<TextIssue, 'layerId' | 'layerName' | 'status'>[]> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Starting AI text analysis for:', text.substring(0, 50) + '...');

    const prompt = `Analyze the following text for grammar, spelling, and style issues. Return a JSON object with an array of issues found.

For each issue, provide:
- id: unique identifier (use random string)
- originalText: the full original text
- issueText: the specific part that has the issue
- suggestion: corrected version of the issue
- type: 'grammar', 'spelling', or 'style'
- confidence: number between 0 and 1
- position: start and end character positions of the issue

Text to analyze: "${text}"

Return format: {"issues": [...]}

If no issues are found, return {"issues": []}.`;

    console.log('Making request to OpenAI API...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful grammar and style checker. Always respond with valid JSON only - no markdown formatting, no code blocks, no backticks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();
    console.log('OpenAI API response received:', data);
    
    const content = data.choices[0] && data.choices[0].message && data.choices[0].message.content;

    if (!content) {
      console.log('No content in response');
      return [];
    }

    console.log('AI response content:', content);

    try {
      // Clean the content to remove markdown formatting
      let cleanContent = content.trim();
      
      // Remove code block markers if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '');
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '');
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.replace(/\s*```$/, '');
      }
      
      console.log('Cleaned content for parsing:', cleanContent);
      
      const parsed = JSON.parse(cleanContent);
      const issues: AIIssue[] = parsed.issues || [];
      
      console.log('Parsed issues:', issues);
      
      const result = issues.map(issue => ({
        id: issue.id || Math.random().toString(36).substr(2, 9),
        originalText: issue.originalText || text,
        issueText: issue.issueText || '',
        suggestion: issue.suggestion || '',
        type: issue.type || 'grammar',
        confidence: issue.confidence || 0.8,
        position: issue.position || { start: 0, end: text.length }
      }));
      
      console.log('Final processed issues:', result);
      return result;
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw content was:', content);
      return [];
    }

  } catch (error) {
    console.error('AI text analysis failed:', error);
    
    // Return empty array if API fails - no fallback mock data
    return [];
  }
}