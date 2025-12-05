/**
 * Type definitions for LLM-based validation
 */

/**
 * Details of a validation violation to be evaluated by LLM
 */
export interface ViolationDetail {
  messageIndex: number;
  componentName: string;
  propName: string;
  propValue: any;
}

/**
 * Context information for LLM evaluation
 */
export interface EvaluationContext {
  componentName: string;
  propName: string;
  propValue: any;
  messageIndex: number;
  precedingMessages: Array<{
    role: string;
    content: any;
    toolCalls?: any[];
  }>;
  toolResults: Map<string, any>;
}

/**
 * LLM's evaluation result for a single violation
 */
export interface LlmEvaluationResult {
  approved: boolean;
  reasoning: string;
  category: 'hardcoded' | 'transformation' | 'derived' | 'unclear';
}

/**
 * Aggregated results from evaluating multiple violations
 */
export interface AggregatedEvaluation {
  approvedCount: number;
  rejectedCount: number;
  details: Array<{
    violation: string;
    approved: boolean;
    reasoning: string;
    category: string;
  }>;
}

/**
 * OpenAI API message format
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API request format
 */
export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
}

/**
 * OpenAI API response format
 */
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
