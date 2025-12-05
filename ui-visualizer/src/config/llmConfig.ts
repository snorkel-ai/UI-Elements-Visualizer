/**
 * Configuration for LLM-based validation using OpenAI API
 *
 * Security Note: API keys are stored in sessionStorage (cleared on tab close)
 * and are visible in browser DevTools Network tab. Suitable for internal tools.
 */

export interface LlmConfig {
  enabled: boolean;
  apiKey?: string;
  model: 'gpt-4' | 'gpt-4o' | 'gpt-4-turbo' | 'o1-preview' | 'o1-mini' | 'gpt-3.5-turbo';
  temperature: number;
  maxTokens: number;
  timeout: number; // milliseconds
}

// Session storage keys
const OPENAI_API_KEY_SESSION = 'openai_api_key';
const OPENAI_MODEL_SESSION = 'openai_model';

/**
 * Store API key in sessionStorage (cleared when tab closes)
 */
export function setApiKey(key: string): void {
  sessionStorage.setItem(OPENAI_API_KEY_SESSION, key);
}

/**
 * Retrieve API key from sessionStorage
 */
export function getApiKey(): string | null {
  return sessionStorage.getItem(OPENAI_API_KEY_SESSION);
}

/**
 * Clear API key from sessionStorage
 */
export function clearApiKey(): void {
  sessionStorage.removeItem(OPENAI_API_KEY_SESSION);
}

/**
 * Store model selection in sessionStorage
 */
export function setModel(model: 'gpt-4' | 'gpt-4o' | 'gpt-4-turbo' | 'o1-preview' | 'o1-mini' | 'gpt-3.5-turbo'): void {
  sessionStorage.setItem(OPENAI_MODEL_SESSION, model);
}

/**
 * Retrieve model selection from sessionStorage
 */
export function getModel(): 'gpt-4' | 'gpt-4o' | 'gpt-4-turbo' | 'o1-preview' | 'o1-mini' | 'gpt-3.5-turbo' {
  const stored = sessionStorage.getItem(OPENAI_MODEL_SESSION);
  if (stored === 'gpt-4' || stored === 'gpt-4o' || stored === 'gpt-4-turbo' ||
      stored === 'o1-preview' || stored === 'o1-mini' || stored === 'gpt-3.5-turbo') {
    return stored;
  }
  return 'gpt-4-turbo'; // Default to gpt-4-turbo for larger context
}

/**
 * Load complete LLM configuration
 * Falls back to environment variable if sessionStorage is empty
 */
export function loadLlmConfig(): LlmConfig {
  const apiKey = getApiKey() || import.meta.env.VITE_OPENAI_API_KEY;

  return {
    enabled: !!apiKey, // Enabled if key is set (either way)
    apiKey,
    model: getModel(),
    temperature: 0.1, // Low for consistent, deterministic responses
    maxTokens: 1000,
    timeout: 30000 // 30 seconds
  };
}
