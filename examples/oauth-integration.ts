// OAuth Integration Examples for OpenAI and Google Gemini

import axios from 'axios';
import { encrypt, decrypt } from '../utils/encryption';
import { db } from '../database/connection';
import { logger } from '../utils/logger';

// OpenAI API Key Management
export class OpenAIIntegration {
  private static readonly OPENAI_API_BASE = 'https://api.openai.com/v1';

  /**
   * Store encrypted OpenAI API key for user
   */
  static async storeAPIKey(userId: string, apiKey: string, keyName: string): Promise<void> {
    try {
      // Test the API key first
      await this.testAPIKey(apiKey);

      // Encrypt the API key
      const encryptedKey = encrypt(apiKey);

      // Store in database
      await db('user_ai_tokens')
        .insert({
          user_id: userId,
          provider: 'openai',
          encrypted_token: encryptedKey,
          token_name: keyName,
          is_active: true,
        })
        .onConflict(['user_id', 'provider', 'token_name'])
        .merge({
          encrypted_token: encryptedKey,
          is_active: true,
          updated_at: new Date(),
        });

      logger.info(`OpenAI API key stored for user ${userId}`);
    } catch (error) {
      logger.error('Failed to store OpenAI API key:', error);
      throw new Error('Invalid OpenAI API key');
    }
  }

  /**
   * Test OpenAI API key validity
   */
  static async testAPIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.OPENAI_API_BASE}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      return response.status === 200;
    } catch (error) {
      logger.warn('OpenAI API key test failed:', error);
      return false;
    }
  }

  /**
   * Get user's OpenAI API key
   */
  static async getUserAPIKey(userId: string, keyName?: string): Promise<string | null> {
    try {
      const query = db('user_ai_tokens')
        .where({
          user_id: userId,
          provider: 'openai',
          is_active: true,
        });

      if (keyName) {
        query.where('token_name', keyName);
      }

      const tokenRecord = await query.first();

      if (!tokenRecord) {
        return null;
      }

      return decrypt(tokenRecord.encrypted_token);
    } catch (error) {
      logger.error('Failed to retrieve OpenAI API key:', error);
      return null;
    }
  }

  /**
   * Make OpenAI API request with user's key
   */
  static async makeRequest(
    userId: string,
    endpoint: string,
    data: any,
    keyName?: string
  ): Promise<any> {
    const apiKey = await this.getUserAPIKey(userId, keyName);
    
    if (!apiKey) {
      throw new Error('No OpenAI API key found for user');
    }

    try {
      const response = await axios.post(`${this.OPENAI_API_BASE}${endpoint}`, data, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      // Log usage for billing/analytics
      await this.logUsage(userId, endpoint, data, response.data);

      return response.data;
    } catch (error) {
      logger.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  /**
   * Get code completion from OpenAI
   */
  static async getCodeCompletion(
    userId: string,
    code: string,
    language: string,
    position: { line: number; character: number }
  ): Promise<any> {
    const prompt = this.buildCompletionPrompt(code, language, position);

    return await this.makeRequest(userId, '/completions', {
      model: 'gpt-3.5-turbo-instruct',
      prompt,
      max_tokens: 100,
      temperature: 0.2,
      stop: ['\n\n', '```'],
    });
  }

  /**
   * Chat with OpenAI
   */
  static async chat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    workspaceContext?: any
  ): Promise<any> {
    const systemMessage = this.buildSystemMessage(workspaceContext);
    const allMessages = [systemMessage, ...messages];

    return await this.makeRequest(userId, '/chat/completions', {
      model: 'gpt-4',
      messages: allMessages,
      max_tokens: 1000,
      temperature: 0.7,
    });
  }

  private static buildCompletionPrompt(
    code: string,
    language: string,
    position: { line: number; character: number }
  ): string {
    const lines = code.split('\n');
    const beforeCursor = lines.slice(0, position.line).join('\n') + 
                        lines[position.line]?.substring(0, position.character) || '';
    const afterCursor = (lines[position.line]?.substring(position.character) || '') +
                       lines.slice(position.line + 1).join('\n');

    return `Complete the following ${language} code:

\`\`\`${language}
${beforeCursor}<CURSOR>${afterCursor}
\`\`\`

Provide only the completion for the <CURSOR> position:`;
  }

  private static buildSystemMessage(workspaceContext?: any): any {
    let systemContent = `You are an AI coding assistant integrated into a web IDE. 
Help users with their code by providing explanations, suggestions, and solutions.
Be concise and practical in your responses.`;

    if (workspaceContext) {
      systemContent += `\n\nCurrent workspace context:
- Language: ${workspaceContext.language}
- Files: ${workspaceContext.files?.map((f: any) => f.path).join(', ')}`;
    }

    return {
      role: 'system',
      content: systemContent,
    };
  }

  private static async logUsage(
    userId: string,
    endpoint: string,
    request: any,
    response: any
  ): Promise<void> {
    try {
      const tokensUsed = response.usage?.total_tokens || 0;
      
      await db('ai_usage_logs').insert({
        user_id: userId,
        provider: 'openai',
        request_type: endpoint.replace('/v1/', ''),
        tokens_used: tokensUsed,
        success: true,
      });
    } catch (error) {
      logger.error('Failed to log OpenAI usage:', error);
    }
  }
}

// Google Gemini Integration
export class GeminiIntegration {
  private static readonly GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

  /**
   * Store encrypted Gemini API key for user
   */
  static async storeAPIKey(userId: string, apiKey: string, keyName: string): Promise<void> {
    try {
      // Test the API key first
      await this.testAPIKey(apiKey);

      // Encrypt the API key
      const encryptedKey = encrypt(apiKey);

      // Store in database
      await db('user_ai_tokens')
        .insert({
          user_id: userId,
          provider: 'gemini',
          encrypted_token: encryptedKey,
          token_name: keyName,
          is_active: true,
        })
        .onConflict(['user_id', 'provider', 'token_name'])
        .merge({
          encrypted_token: encryptedKey,
          is_active: true,
          updated_at: new Date(),
        });

      logger.info(`Gemini API key stored for user ${userId}`);
    } catch (error) {
      logger.error('Failed to store Gemini API key:', error);
      throw new Error('Invalid Gemini API key');
    }
  }

  /**
   * Test Gemini API key validity
   */
  static async testAPIKey(apiKey: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.GEMINI_API_BASE}/models?key=${apiKey}`,
        { timeout: 10000 }
      );

      return response.status === 200;
    } catch (error) {
      logger.warn('Gemini API key test failed:', error);
      return false;
    }
  }

  /**
   * Get user's Gemini API key
   */
  static async getUserAPIKey(userId: string, keyName?: string): Promise<string | null> {
    try {
      const query = db('user_ai_tokens')
        .where({
          user_id: userId,
          provider: 'gemini',
          is_active: true,
        });

      if (keyName) {
        query.where('token_name', keyName);
      }

      const tokenRecord = await query.first();

      if (!tokenRecord) {
        return null;
      }

      return decrypt(tokenRecord.encrypted_token);
    } catch (error) {
      logger.error('Failed to retrieve Gemini API key:', error);
      return null;
    }
  }

  /**
   * Make Gemini API request with user's key
   */
  static async makeRequest(
    userId: string,
    endpoint: string,
    data: any,
    keyName?: string
  ): Promise<any> {
    const apiKey = await this.getUserAPIKey(userId, keyName);
    
    if (!apiKey) {
      throw new Error('No Gemini API key found for user');
    }

    try {
      const response = await axios.post(
        `${this.GEMINI_API_BASE}${endpoint}?key=${apiKey}`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Log usage for billing/analytics
      await this.logUsage(userId, endpoint, data, response.data);

      return response.data;
    } catch (error) {
      logger.error('Gemini API request failed:', error);
      throw error;
    }
  }

  /**
   * Get code completion from Gemini
   */
  static async getCodeCompletion(
    userId: string,
    code: string,
    language: string,
    position: { line: number; character: number }
  ): Promise<any> {
    const prompt = this.buildCompletionPrompt(code, language, position);

    return await this.makeRequest(userId, '/models/gemini-pro:generateContent', {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
        stopSequences: ['\n\n', '```'],
      },
    });
  }

  /**
   * Chat with Gemini
   */
  static async chat(
    userId: string,
    messages: Array<{ role: string; content: string }>,
    workspaceContext?: any
  ): Promise<any> {
    const systemPrompt = this.buildSystemPrompt(workspaceContext);
    
    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Add system prompt as first user message
    contents.unshift({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });

    return await this.makeRequest(userId, '/models/gemini-pro:generateContent', {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });
  }

  private static buildCompletionPrompt(
    code: string,
    language: string,
    position: { line: number; character: number }
  ): string {
    const lines = code.split('\n');
    const beforeCursor = lines.slice(0, position.line).join('\n') + 
                        lines[position.line]?.substring(0, position.character) || '';
    const afterCursor = (lines[position.line]?.substring(position.character) || '') +
                       lines.slice(position.line + 1).join('\n');

    return `Complete the following ${language} code at the cursor position:

\`\`\`${language}
${beforeCursor}|CURSOR|${afterCursor}
\`\`\`

Provide only the code that should replace |CURSOR|:`;
  }

  private static buildSystemPrompt(workspaceContext?: any): string {
    let systemPrompt = `You are an AI coding assistant. Help with code explanations, debugging, and suggestions. Be concise and practical.`;

    if (workspaceContext) {
      systemPrompt += `\n\nWorkspace: ${workspaceContext.language} project with files: ${workspaceContext.files?.map((f: any) => f.path).join(', ')}`;
    }

    return systemPrompt;
  }

  private static async logUsage(
    userId: string,
    endpoint: string,
    request: any,
    response: any
  ): Promise<void> {
    try {
      // Gemini doesn't provide token count in the same way as OpenAI
      // Estimate based on response length
      const tokensUsed = Math.ceil((JSON.stringify(response).length) / 4);
      
      await db('ai_usage_logs').insert({
        user_id: userId,
        provider: 'gemini',
        request_type: endpoint.split('/').pop()?.split(':')[0] || 'unknown',
        tokens_used: tokensUsed,
        success: true,
      });
    } catch (error) {
      logger.error('Failed to log Gemini usage:', error);
    }
  }
}

// AI Provider Router
export class AIProviderRouter {
  /**
   * Route AI request to appropriate provider
   */
  static async routeRequest(
    userId: string,
    provider: 'openai' | 'gemini' | 'shared',
    requestType: 'completion' | 'chat',
    data: any
  ): Promise<any> {
    switch (provider) {
      case 'openai':
        if (requestType === 'completion') {
          return await OpenAIIntegration.getCodeCompletion(
            userId,
            data.code,
            data.language,
            data.position
          );
        } else {
          return await OpenAIIntegration.chat(
            userId,
            data.messages,
            data.workspaceContext
          );
        }

      case 'gemini':
        if (requestType === 'completion') {
          return await GeminiIntegration.getCodeCompletion(
            userId,
            data.code,
            data.language,
            data.position
          );
        } else {
          return await GeminiIntegration.chat(
            userId,
            data.messages,
            data.workspaceContext
          );
        }

      case 'shared':
        return await this.useSharedProvider(userId, requestType, data);

      default:
        throw new Error('Invalid AI provider');
    }
  }

  /**
   * Use shared AI provider with quota limits
   */
  private static async useSharedProvider(
    userId: string,
    requestType: 'completion' | 'chat',
    data: any
  ): Promise<any> {
    // Check user's quota
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      throw new Error('User not found');
    }

    // Check if quota reset is needed
    const today = new Date().toDateString();
    const resetDate = new Date(user.ai_quota_reset_date).toDateString();
    
    if (today !== resetDate) {
      await db('users')
        .where({ id: userId })
        .update({
          ai_quota_used: 0,
          ai_quota_reset_date: new Date(),
        });
      user.ai_quota_used = 0;
    }

    // Check quota limits
    const quotaLimit = this.getQuotaLimit(user.subscription_tier);
    
    if (user.ai_quota_used >= quotaLimit) {
      throw new Error('Daily AI quota exceeded. Please upgrade or wait until tomorrow.');
    }

    // Use server's API key (OpenAI as default for shared)
    const serverApiKey = process.env.OPENAI_API_KEY;
    
    if (!serverApiKey) {
      throw new Error('Shared AI service temporarily unavailable');
    }

    let result;
    if (requestType === 'completion') {
      result = await this.makeSharedCompletionRequest(serverApiKey, data);
    } else {
      result = await this.makeSharedChatRequest(serverApiKey, data);
    }

    // Update user's quota
    await db('users')
      .where({ id: userId })
      .increment('ai_quota_used', 1);

    // Log usage
    await db('ai_usage_logs').insert({
      user_id: userId,
      provider: 'shared',
      request_type: requestType,
      tokens_used: result.usage?.total_tokens || 0,
      success: true,
    });

    return result;
  }

  private static getQuotaLimit(tier: string): number {
    const limits = {
      free: 100,
      premium: 1000,
      enterprise: 10000,
    };
    return limits[tier as keyof typeof limits] || limits.free;
  }

  private static async makeSharedCompletionRequest(apiKey: string, data: any): Promise<any> {
    return await axios.post('https://api.openai.com/v1/completions', {
      model: 'gpt-3.5-turbo-instruct',
      prompt: `Complete this ${data.language} code:\n\n${data.code}`,
      max_tokens: 50,
      temperature: 0.2,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }).then(response => response.data);
  }

  private static async makeSharedChatRequest(apiKey: string, data: any): Promise<any> {
    return await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: data.messages,
      max_tokens: 500,
      temperature: 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }).then(response => response.data);
  }
}

// Usage Examples:

// Store user's OpenAI API key
// await OpenAIIntegration.storeAPIKey('user-123', 'sk-...', 'My OpenAI Key');

// Get code completion using user's key
// const completion = await OpenAIIntegration.getCodeCompletion(
//   'user-123',
//   'def fibonacci(n):\n    if n <= 1:\n        return n\n    return fib',
//   'python',
//   { line: 3, character: 14 }
// );

// Chat with AI using shared provider
// const chatResponse = await AIProviderRouter.routeRequest(
//   'user-123',
//   'shared',
//   'chat',
//   {
//     messages: [
//       { role: 'user', content: 'How do I fix this Python error?' }
//     ],
//     workspaceContext: { language: 'python', files: [{ path: 'main.py' }] }
//   }
// );