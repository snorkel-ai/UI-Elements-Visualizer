/**
 * Shared utility functions for LLM-based validators
 * Handles data truncation, context extraction, and message parsing
 */

import type { ConversationData } from '../types';
import type { MessageStructure, ToolCallSummary, ComponentSummary } from '../types/llmValidation';

/**
 * Pass-through function (no truncation)
 * Previously truncated values, but now returns values unchanged to preserve full context for LLM
 * @param _maxChars Unused parameter (kept for backwards compatibility)
 */
export function truncateValue(value: any, _maxChars: number = 1000): any {
  // No truncation - return value as-is to preserve full conversation context
  return value;
}

/**
 * Extract message structure metadata (lightweight, no content)
 * Used for conversation flow validation
 */
export function extractMessageStructure(conversation: ConversationData): MessageStructure[] {
  return conversation.conversation.map((msg, index) => {
    const hasGradingGuidance = !!(msg as any).grading_guidance;
    const toolCalls = (msg as any).toolCalls || [];
    const hasToolCalls = toolCalls.length > 0;

    // Check for components in content
    let hasComponents = false;
    let componentNames: string[] = [];

    if (Array.isArray(msg.content)) {
      msg.content.forEach((block: any) => {
        if (block.type === 'component' && block.component) {
          hasComponents = true;
          componentNames.push(block.component.name);
        }
      });
    }

    return {
      index,
      role: msg.role,
      hasGradingGuidance,
      hasToolCalls,
      hasComponents,
      componentNames,
      toolCallCount: toolCalls.length
    };
  });
}

/**
 * Extract tool call summaries from conversation
 * Used for tool correctness validation
 */
export function extractToolCallSummaries(conversation: ConversationData): ToolCallSummary[] {
  const summaries: ToolCallSummary[] = [];

  conversation.conversation.forEach((msg, messageIndex) => {
    const toolCalls = (msg as any).toolCalls || [];

    toolCalls.forEach((tc: any) => {
      let args = {};
      try {
        // Parse arguments from string if needed
        if (tc.function?.arguments) {
          args = typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments;
        }
      } catch (e) {
        console.warn(`Failed to parse tool arguments at message ${messageIndex}:`, e);
      }

      summaries.push({
        name: tc.function?.name || '',
        arguments: args,
        messageIndex
      });
    });
  });

  return summaries;
}

/**
 * Build windowed context for a message
 * Returns N messages before the current message (for traceability checks)
 */
export function buildWindowedContext(
  conversation: ConversationData,
  currentIndex: number,
  windowSize: number = 3
): any[] {
  const startIdx = Math.max(0, currentIndex - windowSize);
  return conversation.conversation
    .slice(startIdx, currentIndex + 1)
    .map(msg => ({
      role: msg.role,
      content: truncateValue(msg.content, 1000),
      toolCalls: (msg as any).toolCalls || [],
      grading_guidance: (msg as any).grading_guidance
    }));
}

/**
 * Extract component summaries from a message
 * Returns simplified component info (no code, just props and names)
 */
export function extractComponentsFromMessage(message: any, messageIndex: number): ComponentSummary[] {
  const components: ComponentSummary[] = [];

  if (Array.isArray(message.content)) {
    message.content.forEach((block: any) => {
      if (block.type === 'component' && block.component) {
        components.push({
          name: block.component.name,
          props: truncateValue(block.component.props || {}, 1500),
          messageIndex
        });
      }
    });
  }

  return components;
}

/**
 * Extract text content from a message, excluding component code
 * Used for assistant response validation
 */
export function extractTextContent(message: any): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  if (Array.isArray(message.content)) {
    return message.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text || '')
      .join('\n');
  }

  return '';
}

/**
 * Find a component schema definition by name
 * Searches in componentSchema.$defs
 */
export function findComponentInSchema(
  componentName: string,
  schema: any
): any | null {
  if (!schema || !schema.$defs) {
    return null;
  }

  // Try exact match first
  if (schema.$defs[componentName]) {
    return schema.$defs[componentName];
  }

  // Try case-insensitive match
  const lowerName = componentName.toLowerCase();
  for (const [key, value] of Object.entries(schema.$defs)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return null;
}

/**
 * Parse LLM response JSON
 * Handles markdown code blocks and raw JSON
 * Returns parsed object or throws error
 */
export function parseLlmResponse(content: string): any {
  try {
    // Remove markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (typeof parsed.passed !== 'boolean') {
      throw new Error('Missing required field: passed');
    }

    return parsed;
  } catch (error) {
    console.error('Failed to parse LLM response:', content);
    throw error;
  }
}

/**
 * Extract all tool outputs/results from conversation
 * Returns map of tool_call_id → result content
 */
export function extractToolResults(conversation: ConversationData): Map<string, any> {
  const toolResults = new Map<string, any>();

  conversation.conversation.forEach((msg, idx) => {
    if (msg.role === 'tool') {
      const toolCallId = (msg as any).tool_call_id || (msg as any).toolCallId;
      let content = msg.content;

      // Parse JSON strings
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      // Truncate tool result
      const truncated = truncateValue(content, 2000);

      if (toolCallId) {
        toolResults.set(toolCallId, truncated);
      } else {
        // Fallback: use index-based key
        toolResults.set(`tool_${idx}`, truncated);
      }
    }
  });

  return toolResults;
}

/**
 * Get expected components from grading guidance
 * Returns array of component names from the user's grading guidance
 */
export function getExpectedComponents(message: any): string[] {
  const gg = (message as any).grading_guidance;

  if (!gg || !gg.expected_components) {
    return [];
  }

  if (!Array.isArray(gg.expected_components)) {
    return [];
  }

  return gg.expected_components.map((comp: any) => {
    if (typeof comp === 'string') {
      return comp;
    }
    if (typeof comp === 'object' && comp.name) {
      return comp.name;
    }
    return '';
  }).filter(Boolean);
}
