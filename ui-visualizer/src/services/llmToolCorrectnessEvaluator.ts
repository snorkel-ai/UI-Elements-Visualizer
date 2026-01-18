/**
 * Section 2: Tool Correctness Evaluator
 * Verifies tools are properly defined, consistently used, and appropriately applied
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { ToolCorrectnessViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractToolCallSummaries, extractMessageStructure, truncateValue, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "All tools used are clearly defined in the sample",
  "Tool definitions are consistent and used uniformly throughout",
  "Tools are not used for tasks the model can do natively",
  "Tool execution flags (e.g. tool_executed = true) are accurate",
  "Sequential tool calls appear in separate assistant messages"
];

export async function evaluateToolCorrectnessWithLLM(
  violations: ToolCorrectnessViolation[],
  conversation: ConversationData,
  config: LlmConfig
): Promise<SectionEvaluation> {
  console.log('[LLMAJ Section 2] Tool Correctness evaluation starting...');
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  const startTime = Date.now();
  let totalTokens = 0;
  let failedCallCount = 0;

  // Extract data for evaluation
  const toolDefinitions = conversation.tool_definitions || [];
  const toolCallSummaries = extractToolCallSummaries(conversation);
  const messageStructure = extractMessageStructure(conversation);

  // Parallel evaluation of all checklist items
  const itemResults = await Promise.all(
    CHECKLIST_ITEMS.map(async (checkDescription, itemIndex) => {
      // Filter violations relevant to this checklist item
      const relevantViolations = violations.filter(v =>
        isRelevantToChecklistItem(v, itemIndex)
      );

      // Always call LLM for comprehensive validation, even when no violations detected
      try {
        // Build prompt for this checklist item
        const prompt = buildToolCorrectnessPrompt(
          checkDescription,
          itemIndex,
          relevantViolations,
          toolDefinitions,
          toolCallSummaries,
          messageStructure
        );

        // Call LLM
        const response = await client.createChatCompletion({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'You are validating tool correctness in conversations. Respond with valid JSON only. Provide detailed explanations and relevant context for any failures.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 8000
        });

        totalTokens += (response.usage?.total_tokens || 0);

        // Parse response
        const evaluation = parseLlmResponse(response.choices[0].message.content);

        return {
          checkDescription,
          passed: evaluation.passed,
          failureReason: evaluation.passed ? undefined : evaluation.failureReason,
          context: evaluation.passed ? undefined : evaluation.context,
          severity: evaluation.severity || 'warning'
        } as CheckItemResult;
      } catch (error: any) {
        failedCallCount++;
        console.error(`LLM call failed for tool correctness item ${itemIndex}:`, error.message);
        // Return failure for this item but don't abort
        return {
          checkDescription,
          passed: false,
          failureReason: `LLM evaluation failed: ${error.message}`,
          context: `Violations detected: ${relevantViolations.length}`,
          severity: 'warning' as const
        } as CheckItemResult;
      }
    })
  );

  return {
    sectionId: '2',
    sectionTitle: 'Tool Correctness',
    passed: itemResults.every(r => r.passed),
    checkItemResults: itemResults,
    metadata: {
      llmCallCount: CHECKLIST_ITEMS.length,
      totalTokens,
      evaluationTimeMs: Date.now() - startTime,
      failedCallCount: failedCallCount > 0 ? failedCallCount : undefined
    }
  };
}

function buildToolCorrectnessPrompt(
  checkDescription: string,
  itemIndex: number,
  violations: ToolCorrectnessViolation[],
  toolDefinitions: any[],
  toolCallSummaries: any[],
  messageStructure: any[]
): string {
  let prompt = `
You are evaluating tool usage correctness against this criterion:

CHECKLIST ITEM: "${checkDescription}"

TOOL DEFINITIONS:
${toolDefinitions.length > 0 ? JSON.stringify(toolDefinitions, null, 2) : '(No tool definitions found)'}

TOOL CALLS IN CONVERSATION:
${toolCallSummaries.map((tc, i) => `
${i + 1}. Message ${tc.messageIndex}: ${tc.name}
   Arguments: ${JSON.stringify(truncateValue(tc.arguments, 500), null, 2)}
`).join('\n')}

MESSAGE STRUCTURE:
${messageStructure.map(m => `
Message ${m.index} (${m.role}): ${m.toolCallCount} tool call(s), ${m.componentNames.length} component(s)
`).join('\n')}
`;

  if (violations.length > 0) {
    prompt += `\n\nPOTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => `
${i + 1}. Tool "${v.toolName}" (${v.violationType}):
   Messages: ${v.messageIndices.join(', ')}
   Details: ${v.details}
`).join('\n')}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // All tools defined
      prompt += `- Every tool used in the conversation must have a corresponding tool_definitions entry
- Check that all tool names in tool calls match a defined tool
- If tool_definitions is empty but tools are used, this is a violation`;
      break;
    case 1: // Consistent definitions
      prompt += `- Same tool must maintain the same definition if used multiple times
- Check for consistent parameter names, types, and requirements
- Tool behavior should not change across uses`;
      break;
    case 2: // No native tasks
      prompt += `- Tools should NOT be used for tasks the model can do natively:
  * JSON parsing/formatting
  * String manipulation
  * Basic arithmetic
  * Date formatting
  * Text extraction from given content
- Models can do these themselves without external tools`;
      break;
    case 3: // Execution flags accurate
      prompt += `- If tool_executed flags exist, they should accurately reflect whether tools ran
- Check for any tool_executed metadata in the conversation
- Flags should be true only when tool actually executed`;
      break;
    case 4: // Sequential calls separate
      prompt += `- IMPORTANT: Multiple tool calls in the same message are VALID and EXPECTED when they can run in parallel
- This is ONLY a violation if tool calls have dependencies on each other's outputs
- Parallel tool calls (independent data fetching) in same message: VALID ✓
- Sequential tool calls (one depends on other's output) in same message: VIOLATION ✗

VALID Examples (parallel, can be in same message):
  * get_weekly_schedule + get_user_constraints (both fetch independent data)
  * search_database + get_config (independent lookups)
  * fetch_weather + fetch_news (unrelated data sources)

INVALID Examples (sequential, must be separate messages):
  * get_user + update_user (update needs user_id from get response)
  * create_order + process_payment (payment needs order_id from create)
  * search_items + get_item_details (details needs item_id from search)

EVALUATION INSTRUCTIONS:
1. Look at the tool names and their likely purposes
2. Check if tool B's parameters could come from tool A's response
3. If tools are clearly independent, PASS this check
4. Only FAIL if there's a clear dependency relationship`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of what's wrong. Include specific tool names, message numbers, and exact issues.",
  "context": "IF FAILED: Relevant context showing the violation. Quote problematic tool calls and explain why they fail this criterion.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. Which specific tool(s) violated the criterion
2. Where they appear (message numbers)
3. Why it's a violation (what's wrong or missing)
4. What should be done to fix it`;

  return prompt;
}

function isRelevantToChecklistItem(
  violation: ToolCorrectnessViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'inconsistent_definition': [0, 1],
    'unnecessary_tool': [2],
    'incorrect_flag': [3],
    'sequential_issue': [4]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}

