/**
 * OpenAI API client for browser environment
 *
 * Handles API requests with timeout, error handling, and token usage logging
 */

import type { OpenAIRequest, OpenAIResponse } from '../types/llmValidation';

export class OpenAIClient {
  private apiKey: string;
  private timeout: number;

  constructor(apiKey: string, timeout: number = 30000) {
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  /**
   * Create a chat completion request to OpenAI API
   */
  async createChatCompletion(request: OpenAIRequest): Promise<OpenAIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}\n${errorBody}`
        );
      }

      const data: OpenAIResponse = await response.json();

      // Log token usage for cost tracking
      if (data.usage) {
        console.debug(
          '[LLM Validation] Token usage:',
          `${data.usage.total_tokens} tokens`,
          `(prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`
        );
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`OpenAI API request timed out after ${this.timeout}ms`);
      }

      // Re-throw with context
      throw new Error(`OpenAI API request failed: ${error.message}`);
    }
  }
}
