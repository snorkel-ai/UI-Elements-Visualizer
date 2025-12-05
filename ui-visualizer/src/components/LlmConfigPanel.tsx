/**
 * LLM Configuration Panel
 *
 * Allows users to input OpenAI API key and select model for LLM-based validation
 */

import { useState } from 'react';
import { getApiKey, setApiKey, clearApiKey, getModel, setModel } from '../config/llmConfig';

interface LlmConfigPanelProps {
  onConfigChange?: () => void; // Callback when config is saved (to trigger re-validation)
}

export function LlmConfigPanel({ onConfigChange }: LlmConfigPanelProps) {
  const [apiKey, setApiKeyState] = useState(getApiKey() || '');
  const [model, setModelState] = useState<'gpt-4' | 'gpt-4o' | 'gpt-4-turbo' | 'o1-preview' | 'o1-mini' | 'gpt-3.5-turbo'>(getModel());
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(!!getApiKey());

  const handleSave = () => {
    if (apiKey.trim()) {
      setApiKey(apiKey.trim());
      setModel(model);
      setIsSaved(true);
      console.log('[LLM Config] API key saved to sessionStorage');

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
          <h3 className="font-semibold text-gray-900">🤖 LLM Validation</h3>
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
              Uses OpenAI to detect false positives in prop source validation (e.g., hardcoded data, reasonable transformations).
              Helps reduce manual review time.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              ⚠️ <span className="font-medium">Security Note:</span> Key is stored in session storage (cleared when tab closes).
              Visible in browser DevTools Network tab. Network traffic is encrypted via HTTPS.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModelState(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gpt-4-turbo">GPT-4 Turbo (recommended, 128k context, ~$0.01/violation)</option>
              <option value="o1-preview">o1-preview (most capable, 128k context, ~$0.05/violation)</option>
              <option value="o1-mini">o1-mini (fast reasoning, 128k context, ~$0.015/violation)</option>
              <option value="gpt-4o">GPT-4o (fast, 128k context, ~$0.0075/violation)</option>
              <option value="gpt-4">GPT-4 (8k context, ~$0.018/violation)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (8k context, ~$0.0006/violation)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Use GPT-4 Turbo or o1 models for large props (128k context). GPT-4 and GPT-3.5 have only 8k context and may fail on large data.
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
              <li>When validation finds unclear prop sources, LLM analyzes each violation</li>
              <li>LLM determines if prop is hardcoded, a transformation, or genuinely unclear</li>
              <li>If all violations are approved, the check passes with "LLM assistance" label</li>
              <li>Evaluation happens sequentially to respect API rate limits (~2s per violation)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
