/**
 * Portkey LLM Gateway client for browser environment
 *
 * Handles API requests through Portkey with timeout, error handling, and token usage logging
 */

import Portkey from 'portkey-ai';
import type { OpenAIRequest, OpenAIResponse } from '../types/llmValidation';

export class OpenAIClient {
  private portkey: Portkey;
  private timeout: number;

  constructor(apiKey: string, timeout: number = 30000) {
    this.portkey = new Portkey({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
      metadata: {
        _source: 'mistral-ui-visualizer'
      }
    });
    this.timeout = timeout;
  }

  /**
   * Create a chat completion request via Portkey Gateway
   */
  async createChatCompletion(request: OpenAIRequest): Promise<OpenAIResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Use Portkey's chat completions API with metadata
      const response = await this.portkey.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.max_tokens,
        metadata: {
          _source: 'mistral-ui-visualizer'
        }
      } as any); // Type assertion needed for metadata field

      clearTimeout(timeoutId);

      // Convert Portkey response to OpenAIResponse format
      const data: OpenAIResponse = {
        choices: response.choices.map((choice: any) => ({
          message: {
            content: choice.message.content || ''
          },
          finish_reason: choice.finish_reason
        })),
        usage: response.usage &&
               response.usage.prompt_tokens !== undefined &&
               response.usage.completion_tokens !== undefined &&
               response.usage.total_tokens !== undefined ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined
      };

      // Log token usage for cost tracking
      if (data.usage) {
        console.debug(
          '[LLM Validation via Portkey] Token usage:',
          `${data.usage.total_tokens} tokens`,
          `(prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`,
          `Model: ${request.model}`
        );
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Portkey API request timed out after ${this.timeout}ms`);
      }

      // Re-throw with context
      throw new Error(`Portkey API request failed: ${error.message}`);
    }
  }
}
