/**
 * LLM-based evaluation of component props source violations
 *
 * Uses OpenAI API to determine if violations are false positives
 * (e.g., hardcoded data, reasonable transformations)
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type {
  ViolationDetail,
  EvaluationContext,
  LlmEvaluationResult,
  AggregatedEvaluation
} from '../types/llmValidation';
import type { ConversationData } from '../types';

/**
 * Truncate a value to reduce token count
 * Keeps structure but limits array lengths and string sizes
 */
function truncateValue(value: any, maxChars: number = 1000): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (value.length > maxChars) {
      return value.substring(0, maxChars) + '... [truncated]';
    }
    return value;
  }

  if (Array.isArray(value)) {
    // For arrays, keep first 3 items and last 1 item
    if (value.length > 4) {
      return [
        ...value.slice(0, 3).map(item => truncateValue(item, maxChars / 2)),
        `... [${value.length - 4} items omitted]`,
        truncateValue(value[value.length - 1], maxChars / 2)
      ];
    }
    return value.map(item => truncateValue(item, maxChars / 2));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 10) {
      // Keep first 10 keys
      const truncated: any = {};
      entries.slice(0, 10).forEach(([key, val]) => {
        truncated[key] = truncateValue(val, maxChars / 2);
      });
      truncated['...'] = `[${entries.length - 10} more keys omitted]`;
      return truncated;
    }

    const truncated: any = {};
    entries.forEach(([key, val]) => {
      truncated[key] = truncateValue(val, maxChars / 2);
    });
    return truncated;
  }

  return value;
}

/**
 * Build evaluation context from violation and conversation
 */
function buildEvaluationContext(
  violation: ViolationDetail,
  conversation: ConversationData
): EvaluationContext {
  const messageIndex = violation.messageIndex;

  // Step 1: Collect only recent tool results (last 3 before this message)
  // Truncate each to 2000 chars max
  const toolResults = new Map<string, any>();
  const toolMessages = conversation.conversation
    .map((msg, idx) => ({ msg, idx }))
    .filter(({ msg, idx }) => msg.role === 'tool' && idx < messageIndex)
    .slice(-3); // Only last 3 tool results

  toolMessages.forEach(({ msg, idx }) => {
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
  });

  // Step 2: Get preceding messages (only 2 for context, not 3)
  const startIdx = Math.max(0, messageIndex - 2);
  const precedingMessages = conversation.conversation
    .slice(startIdx, messageIndex + 1)
    .map(msg => {
      // Truncate message content
      const truncatedContent = typeof msg.content === 'object'
        ? truncateValue(msg.content, 1000)
        : msg.content;

      return {
        ...msg,
        content: truncatedContent
      };
    });

  return {
    componentName: violation.componentName,
    propName: violation.propName,
    propValue: truncateValue(violation.propValue, 1500), // Truncate prop value
    messageIndex,
    precedingMessages,
    toolResults
  };
}

/**
 * Format context into prompt for LLM
 */
function formatPromptForLLM(context: EvaluationContext): string {
  // Build tool results section
  const toolResultsSection = Array.from(context.toolResults.entries())
    .map(([id, result]) => {
      const resultStr = typeof result === 'object'
        ? JSON.stringify(result, null, 2)
        : String(result);
      return `[Tool Result ${id}]:\n${resultStr}`;
    })
    .join('\n\n');

  // Build preceding messages section
  const messagesSection = context.precedingMessages
    .map((msg, idx) => {
      const contentStr = typeof msg.content === 'object'
        ? JSON.stringify(msg.content, null, 2)
        : String(msg.content);
      return `[Message ${idx + 1} - ${msg.role}]:\n${contentStr}`;
    })
    .join('\n\n');

  // Format prop value for display
  const propValueStr = typeof context.propValue === 'object'
    ? JSON.stringify(context.propValue, null, 2)
    : String(context.propValue);

  return `You are validating whether a React component prop value can be reasonably traced to tool results or is appropriately hardcoded/static data.

⚠️ CRITICAL: You must check EVERY field/subfield individually. If ANY field cannot be traced or validated, REJECT the entire prop.

NOTE: Large values have been truncated to reduce token count. Look for patterns and structure rather than exact matches.

COMPONENT: ${context.componentName}
PROP NAME: ${context.propName}
PROP VALUE (may be truncated): ${propValueStr}

PRECEDING CONVERSATION MESSAGES (only last 2-3, truncated):
${messagesSection}

AVAILABLE TOOL RESULTS (only last 3, truncated):
${toolResultsSection || '(No tool results available)'}

EVALUATION CRITERIA - CHECK EACH FIELD:

For OBJECTS/NESTED DATA:
- Check EVERY key-value pair individually
- If the prop is an object like {"url": "DATA.image.url", "caption": "Photo"}, you must verify:
  1. Does "DATA.image.url" actually exist in the tool results?
  2. Is "Photo" a reasonable static value or derived from data?
- String references like "MAP_DATA.snapshot.url" or "TOOL.field.path" MUST exist in tool results
- Reject if ANY field cannot be traced

For ARRAYS:
- Check if array items match tool result data (exact or transformed)
- For string arrays, check if strings exist in tool results or are reasonable static data
- Reject if items seem to reference non-existent data

APPROVAL CRITERIA:
1. Hardcoded/static data (no tool results needed):
   - UI labels, placeholders, titles
   - Configuration values (timeouts, limits, presets)
   - Static arrays for UI rendering (e.g., ["option1", "option2"])

2. Valid transformations of tool data:
   - Counting items from tool results
   - Formatting dates/numbers from tool data
   - Extracting specific fields that EXIST in tool results
   - Mapping/filtering arrays from tool results
   - Computing derived values from tool data

3. Clearly derived from tool output:
   - Tool output provides raw data, prop has formatted version
   - All referenced fields actually exist in tool results

REJECTION CRITERIA (REJECT if any apply):
- String references to data paths that don't exist (e.g., "DATA.missing.field")
- Mix of valid and invalid fields (reject the entire prop)
- Cannot trace field origin and it's not clearly static
- Data structure doesn't match tool results

EXAMPLE REJECTION:
Prop: {"imageUrl": "MAP.snapshot.url", "layers": ["parks"]}
Tool Results: {"snapshot": {"image": "http://..."}, "layerOrder": ["parks"]}
REJECT: "MAP.snapshot.url" path doesn't exist (should be "snapshot.image")

RESPOND WITH VALID JSON ONLY:
{
  "approved": true or false,
  "reasoning": "Brief explanation checking ALL fields individually",
  "category": "hardcoded" or "transformation" or "derived" or "unclear"
}`;
}

/**
 * Parse LLM response text into structured result
 */
function parseLlmResponse(responseText: string): LlmEvaluationResult {
  try {
    // Handle markdown code blocks: ```json ... ```
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonText: string;

    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      // Try to extract raw JSON
      const rawMatch = responseText.match(/\{[\s\S]*\}/);
      if (!rawMatch) {
        throw new Error('No JSON found in LLM response');
      }
      jsonText = rawMatch[0];
    }

    const parsed = JSON.parse(jsonText);

    // Validate required fields
    if (typeof parsed.approved !== 'boolean') {
      throw new Error('Missing or invalid "approved" field');
    }

    return {
      approved: parsed.approved,
      reasoning: parsed.reasoning || 'No reasoning provided',
      category: parsed.category || 'unclear'
    };
  } catch (error: any) {
    // Conservative fallback: Treat parse errors as rejection
    console.error('[LLM Validation] Failed to parse LLM response:', error.message);
    console.debug('[LLM Validation] Response text:', responseText);

    return {
      approved: false,
      reasoning: `LLM response parsing failed: ${error.message}`,
      category: 'unclear'
    };
  }
}

/**
 * Evaluate multiple violations using LLM
 */
export async function evaluateViolationsWithLLM(
  violations: ViolationDetail[],
  conversation: ConversationData,
  config: LlmConfig
): Promise<AggregatedEvaluation> {
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const client = new OpenAIClient(config.apiKey, config.timeout);
  const results: AggregatedEvaluation = {
    approvedCount: 0,
    rejectedCount: 0,
    details: []
  };

  // Evaluate each violation sequentially (avoid rate limits)
  for (const violation of violations) {
    try {
      const context = buildEvaluationContext(violation, conversation);
      const prompt = formatPromptForLLM(context);

      console.debug(
        `[LLM Validation] Evaluating: ${violation.componentName}.${violation.propName}`
      );

      const response = await client.createChatCompletion({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a code validation assistant. Respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: config.temperature,
        max_tokens: config.maxTokens
      });

      const llmResponse = response.choices[0]?.message?.content;
      if (!llmResponse) {
        throw new Error('Empty response from OpenAI API');
      }

      const evaluation = parseLlmResponse(llmResponse);

      // Track results
      if (evaluation.approved) {
        results.approvedCount++;
      } else {
        results.rejectedCount++;
      }

      results.details.push({
        violation: `Message ${violation.messageIndex + 1}, Component ${violation.componentName}.${violation.propName}`,
        approved: evaluation.approved,
        reasoning: evaluation.reasoning,
        category: evaluation.category
      });

      console.debug(
        `[LLM Validation] Result: ${evaluation.approved ? '✓ Approved' : '✗ Rejected'} (${evaluation.category})`
      );
    } catch (error: any) {
      // On error, treat as rejection (conservative)
      console.error(
        `[LLM Validation] Error evaluating ${violation.componentName}.${violation.propName}:`,
        error.message
      );
      results.rejectedCount++;
      results.details.push({
        violation: `Message ${violation.messageIndex + 1}, Component ${violation.componentName}.${violation.propName}`,
        approved: false,
        reasoning: `Evaluation failed: ${error.message}`,
        category: 'unclear'
      });
    }
  }

  console.info(
    `[LLM Validation] Complete: ${results.approvedCount} approved, ${results.rejectedCount} rejected`
  );

  return results;
}
