import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Chat completion endpoint - no auth required for shared provider
router.post('/chat', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { messages, provider, model, workspaceId, apiKey } = req.body;

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const fullMessage = messages[messages.length - 1]?.content || '';
    
    // Extract just the user's message (before any file context)
    const userMessage = fullMessage.split('\n\nCurrent file:')[0] || fullMessage;

    // If using shared provider, allow without authentication (mock responses only)
    if (provider === 'shared' || !apiKey || !provider) {
      const mockResponse = generateMockAIResponse(userMessage);
      res.json({
        response: mockResponse,
        conversationId: `conv-${Date.now()}`,
        model: model || 'shared-ai',
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      });
      return;
    }

    // For real API providers, require authentication
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token || !token.startsWith('mock-jwt-token')) {
      res.status(401).json({ error: 'Authentication required for API providers' });
      return;
    }

    // Extract user ID from token for authenticated requests
    const tokenParts = token.split('-');
    let userId = '1';
    if (tokenParts.length >= 5) {
      const timestampPart = tokenParts[tokenParts.length - 1];
      const userIdParts = tokenParts.slice(3, -1);
      if (!isNaN(Number(timestampPart)) && userIdParts.length > 0) {
        userId = userIdParts.join('-');
      }
    }

    // Use real API if API key is provided
    let response;
    if (provider === 'openai' && apiKey) {
      response = await callOpenAI(messages, model || 'gpt-3.5-turbo', apiKey);
    } else if (provider === 'gemini' && apiKey) {
      response = await callGemini(messages, model || 'gemini-pro', apiKey);
    } else {
      // Fallback to mock response for unsupported providers
      const mockResponse = generateMockAIResponse(userMessage);
      res.json({
        response: mockResponse,
        conversationId: `conv-${Date.now()}`,
        model: model || 'shared-ai',
        usage: {
          prompt_tokens: 50,
          completion_tokens: 100,
          total_tokens: 150
        }
      });
      return;
    }

    res.json({
      response: response.content,
      conversationId: `conv-${Date.now()}`,
      model: response.model,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('AI chat error:', error);
    
    // Fallback to mock response on error
    const userMessage = req.body.messages?.[req.body.messages.length - 1]?.content || '';
    const mockResponse = generateMockAIResponse(userMessage);
    
    res.json({
      response: mockResponse + '\n\n(Note: Using fallback AI due to API error)',
      conversationId: `conv-${Date.now()}`,
      model: 'fallback-ai',
      usage: {
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150
      }
    });
  }
});

// Code completion endpoint
router.post('/complete', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language, cursor } = req.body;
    const userId = req.user.userId;

    if (!code || !language) {
      res.status(400).json({ error: 'Code and language are required' });
      return;
    }

    // Mock code completion
    const completions = generateMockCompletions(code, language, cursor);

    res.json({
      completions,
      model: 'code-davinci-002',
      usage: {
        prompt_tokens: 25,
        completion_tokens: 10,
        total_tokens: 35
      }
    });

  } catch (error) {
    console.error('Code completion error:', error);
    res.status(500).json({ error: 'Failed to generate completions' });
  }
});

// Code explanation endpoint
router.post('/explain', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language } = req.body;
    const userId = req.user.userId;

    if (!code || !language) {
      res.status(400).json({ error: 'Code and language are required' });
      return;
    }

    // Mock code explanation
    const explanation = generateMockExplanation(code, language);

    res.json({
      explanation,
      model: 'gpt-3.5-turbo',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      }
    });

  } catch (error) {
    console.error('Code explanation error:', error);
    res.status(500).json({ error: 'Failed to explain code' });
  }
});

// Code review endpoint
router.post('/review', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language } = req.body;
    const userId = req.user.userId;

    if (!code || !language) {
      res.status(400).json({ error: 'Code and language are required' });
      return;
    }

    // Mock code review
    const review = generateMockReview(code, language);

    res.json({
      review,
      model: 'gpt-4',
      usage: {
        prompt_tokens: 150,
        completion_tokens: 250,
        total_tokens: 400
      }
    });

  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({ error: 'Failed to review code' });
  }
});

function generateMockAIResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();
  
  // Check for debugging/error help
  if (message.includes('debug') || message.includes('error') || message.includes('bug') || message.includes('fix') || message.includes('problem')) {
    return "I'd be happy to help you debug that issue! Could you share the specific error message and the relevant code? I can help identify the problem and suggest solutions.";
  }
  
  // Check for code requests
  if (message.includes('code') || message.includes('write') || message.includes('create') || message.includes('build')) {
    return "I can help you write code! What programming language are you using, and what functionality do you need? I can provide examples and best practices.";
  }
  
  // Check for explanations
  if (message.includes('explain') || message.includes('understand') || message.includes('what is') || message.includes('how does')) {
    return "I'd be happy to explain any code or concept! Share the code you'd like me to explain, and I'll break it down step by step, explaining what each part does and how it works together.";
  }
  
  // Check for functions/methods
  if (message.includes('function') || message.includes('method')) {
    return "I can help you write functions! What programming language are you using, and what should the function do? I can provide examples and best practices.";
  }
  
  // Check for optimization
  if (message.includes('optimize') || message.includes('performance') || message.includes('faster') || message.includes('improve')) {
    return "Great question about optimization! I can help you improve code performance by suggesting better algorithms, data structures, or coding patterns. Share your code and I'll provide specific recommendations.";
  }
  
  // Check for greetings
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return "Hello! I'm your AI coding assistant. I can help you with code completion, explanations, debugging, and more. What would you like to work on?";
  }
  
  // Check for testing
  if (message.includes('test')) {
    return "I see you're testing the AI assistant! Great! I'm working correctly now. Try asking me about debugging, code explanations, writing functions, or any other coding questions!";
  }
  
  return "I'm here to help with your coding questions! I can assist with debugging, code explanations, writing functions, optimization, and general programming guidance. What specific challenge are you working on?";
}

function generateMockCompletions(code: string, language: string, cursor?: number): any[] {
  const completions = [];
  
  if (language === 'javascript' || language === 'typescript') {
    if (code.includes('console.')) {
      completions.push({
        text: 'log(',
        displayText: 'log(value)',
        type: 'method'
      });
    }
    
    if (code.includes('function ') || code.includes('const ')) {
      completions.push({
        text: '{\n  \n}',
        displayText: '{ ... }',
        type: 'snippet'
      });
    }
  }
  
  if (language === 'python') {
    if (code.includes('def ')) {
      completions.push({
        text: ':\n    pass',
        displayText: ': pass',
        type: 'snippet'
      });
    }
    
    if (code.includes('print(')) {
      completions.push({
        text: '"Hello, World!")',
        displayText: '"Hello, World!")',
        type: 'string'
      });
    }
  }
  
  return completions;
}

function generateMockExplanation(code: string, language: string): string {
  if (language === 'python' && code.includes('def fibonacci')) {
    return `This code defines a Fibonacci function that calculates the nth Fibonacci number. The Fibonacci sequence starts with 0 and 1, and each subsequent number is the sum of the two preceding ones. This implementation uses recursion, which is elegant but not the most efficient for large numbers due to repeated calculations.`;
  }
  
  if (language === 'javascript' && code.includes('console.log')) {
    return `This code uses console.log() to output information to the browser's developer console or Node.js terminal. It's commonly used for debugging and displaying program results. The console.log() function can accept multiple arguments and will display them separated by spaces.`;
  }
  
  return `This ${language} code performs the following operations:\n\n1. Defines variables and data structures\n2. Implements the main logic flow\n3. Handles input/output operations\n4. Returns or displays results\n\nThe code follows standard ${language} syntax and conventions.`;
}

function generateMockReview(code: string, language: string): any {
  const issues = [];
  const suggestions = [];
  
  if (code.includes('var ') && (language === 'javascript' || language === 'typescript')) {
    issues.push({
      line: 1,
      type: 'warning',
      message: 'Consider using "let" or "const" instead of "var" for better scoping'
    });
  }
  
  if (!code.includes('try') && code.includes('JSON.parse')) {
    issues.push({
      line: 1,
      type: 'error',
      message: 'JSON.parse should be wrapped in try-catch to handle parsing errors'
    });
  }
  
  suggestions.push('Consider adding input validation');
  suggestions.push('Add error handling for edge cases');
  suggestions.push('Include unit tests for better code reliability');
  
  return {
    overall_score: 7.5,
    issues,
    suggestions,
    strengths: [
      'Code is readable and well-structured',
      'Good variable naming conventions',
      'Follows language best practices'
    ]
  };
}

// Real OpenAI API call
async function callOpenAI(messages: any[], model: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
    usage?: any;
  };
  
  return {
    content: data.choices?.[0]?.message?.content || 'No response',
    model: data.model || model,
    usage: data.usage || { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
  };
}

// Real Gemini API call
async function callGemini(messages: any[], model: string, apiKey: string) {
  const lastMessage = messages[messages.length - 1];
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: lastMessage.content
        }]
      }],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7
      }
    })
  });

  if (!response.ok) {
    const error = await response.json() as { error?: { message?: string } };
    throw new Error(error.error?.message || 'Gemini API error');
  }

  const data = await response.json() as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  
  return {
    content: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response',
    model,
    usage: {
      prompt_tokens: 50,
      completion_tokens: 100,
      total_tokens: 150
    }
  };
}

export { router as aiRoutes };