/**
 * LLM Configuration Panel
 *
 * Allows users to input Portkey API key and select model for LLM-based validation
 */

import { useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, getModel, setModel } from '../config/llmConfig';

interface LlmConfigPanelProps {
  onConfigChange?: () => void; // Callback when config is saved (to trigger re-validation)
}

export function LlmConfigPanel({ onConfigChange }: LlmConfigPanelProps) {
  const [apiKey, setApiKeyState] = useState(getApiKey() || '');
  const [model, setModelState] = useState(getModel());
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(!!getApiKey());

  const handleSave = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setModel(model);
      setIsSaved(true);
      console.log('[LLM Config] Portkey API key saved to sessionStorage');

      if (onConfigChange) {
        onConfigChange();
      }
    }
  };

  const handleClear = () => {
    clearApiKey();
    setApiKeyState('');
    setIsSaved(false);
    console.log('[LLM Config] API key cleared');

    if (onConfigChange) {
      onConfigChange();
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 mb-4 bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">🤖 LLM Validation (via Portkey)</h3>
          {isSaved && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Configured
            </span>
          )}
          <span className="text-xs text-gray-500">(Optional)</span>
        </div>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="px-3 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded"
        >
          {isVisible ? 'Hide' : 'Configure'}
        </button>
      </div>

      {isVisible && (
        <div className="mt-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            <p className="font-medium mb-1">About LLM Validation</p>
            <p className="text-xs">
              Uses Portkey LLM Gateway to validate conversations with models from multiple providers (Gemini, OpenAI, Claude, etc.).
              Helps detect false positives in prop source validation and verify conversation quality.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portkey API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="Enter your Portkey API key..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              ⚠️ <span className="font-medium">Security Note:</span> Key is stored in session storage (cleared when tab closes).
              Visible in browser DevTools Network tab. Network traffic is encrypted via HTTPS.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model (use @provider/model format)
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModelState(e.target.value)}
              placeholder="@gemini/gemini-3-pro-preview"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Examples: @gemini/gemini-3-pro-preview (default), @openai/gpt-4o, @anthropic/claude-3-5-sonnet
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSaved ? 'Update & Re-run Validation' : 'Save & Run Validation'}
            </button>
            {isSaved && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded hover:bg-gray-300"
              >
                Clear Key
              </button>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3 text-xs text-gray-600">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Portkey routes requests to your specified LLM provider (Gemini, OpenAI, Claude, etc.)</li>
              <li>When validation finds issues, LLM analyzes each violation for accuracy</li>
              <li>LLM determines if issues are false positives or genuine problems</li>
              <li>Multiple sections validated concurrently for speed (~30 LLM calls per conversation)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
