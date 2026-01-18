/**
 * Configuration for LLM-based validation using Portkey Gateway
 *
 * Security Note: API keys are stored in sessionStorage (cleared on tab close)
 * and are visible in browser DevTools Network tab. Suitable for internal tools.
 */

export interface LlmConfig {
  enabled: boolean;
  apiKey?: string;
  model: string; // Supports @provider/model format (e.g., @gemini/gemini-3-pro-preview)
  temperature: number;
  maxTokens: number;
  timeout: number; // milliseconds
}

// Session storage keys
const PORTKEY_API_KEY_SESSION = 'portkey_api_key';
const LLM_MODEL_SESSION = 'llm_model';

/**
 * Store Portkey API key in sessionStorage (cleared when tab closes)
 */
export function setApiKey(key: string): void {
  sessionStorage.setItem(PORTKEY_API_KEY_SESSION, key);
}

/**
 * Retrieve Portkey API key from sessionStorage
 */
export function getApiKey(): string | null {
  return sessionStorage.getItem(PORTKEY_API_KEY_SESSION);
}

/**
 * Clear API key from sessionStorage
 */
export function clearApiKey(): void {
  sessionStorage.removeItem(PORTKEY_API_KEY_SESSION);
}

/**
 * Store model selection in sessionStorage
 */
export function setModel(model: string): void {
  sessionStorage.setItem(LLM_MODEL_SESSION, model);
}

/**
 * Retrieve model selection from sessionStorage
 */
export function getModel(): string {
  const stored = sessionStorage.getItem(LLM_MODEL_SESSION);
  return stored || '@gemini/gemini-3-pro-preview'; // Default to Gemini 3 Pro
}

/**
 * Load complete LLM configuration
 * Falls back to environment variable if sessionStorage is empty
 */
export function loadLlmConfig(): LlmConfig {
  const apiKey = getApiKey() || import.meta.env.VITE_PORTKEY_API_KEY;

  return {
    enabled: !!apiKey, // Enabled if key is set (either way)
    apiKey,
    model: getModel(),
    temperature: 0.1, // Low for consistent, deterministic responses
    maxTokens: 1000,
    timeout: 30000 // 30 seconds
  };
}
