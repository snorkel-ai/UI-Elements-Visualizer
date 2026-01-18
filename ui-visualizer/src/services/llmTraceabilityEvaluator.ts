/**
 * Section 1: Traceability Evaluator
 * Ensures all information traces back to conversation context or tool outputs
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { TraceabilityViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { buildWindowedContext, extractToolResults, truncateValue, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "Every assistant action, claim, or component field is traceable to a user message, prior context, or a tool output",
  "Every action that requires a tool has a corresponding tool call",
  "Component properties only appear after the User Prompt or context that populates them",
  "All component content is pulled from conversation context, prompts, responses, or tool calls (no hallucinated content)"
];

export async function evaluateTraceabilityWithLLM(
  violations: TraceabilityViolation[],
  conversation: ConversationData,
  config: LlmConfig
): Promise<SectionEvaluation> {
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  console.log('[LLMAJ Section 1: Traceability] Evaluation starting...');
  const startTime = Date.now();
  let totalTokens = 0;
  let failedCallCount = 0;

  // Extract tool results for reference
  const toolResults = extractToolResults(conversation);

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
        const prompt = buildTraceabilityPrompt(
          checkDescription,
          itemIndex,
          relevantViolations,
          conversation,
          toolResults
        );

        // Call LLM
        const response = await client.createChatCompletion({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'You are validating conversation traceability. Respond with valid JSON only. Provide detailed explanations and relevant context for any failures.'
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
        console.error(`LLM call failed for traceability item ${itemIndex}:`, error.message);
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
    sectionId: '1',
    sectionTitle: 'Traceability',
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

function buildTraceabilityPrompt(
  checkDescription: string,
  itemIndex: number,
  violations: TraceabilityViolation[],
  conversation: ConversationData,
  toolResults: Map<string, any>
): string {
  let prompt = `
You are evaluating conversation traceability against this criterion:

CHECKLIST ITEM: "${checkDescription}"

POTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => {
    const contextWindow = buildWindowedContext(conversation, v.messageIndex, 3);
    return `
${i + 1}. Message ${v.messageIndex} (${v.violationType}):
   Content: ${truncateValue(v.content, 500)}
   Context window (3 prior messages):
${contextWindow.map((msg, idx) => `     - Msg ${v.messageIndex - contextWindow.length + idx + 1} (${msg.role}): ${truncateValue(msg.content, 200)}`).join('\n')}
   ${v.context ? `Additional context: ${JSON.stringify(truncateValue(v.context, 500), null, 2)}` : ''}
`;
  }).join('\n')}

TOOL RESULTS AVAILABLE:
${toolResults.size > 0 ? Array.from(toolResults.entries()).slice(0, 5).map(([id, result]) => `
  ${id}: ${JSON.stringify(truncateValue(result, 300), null, 2)}
`).join('\n') : '(No tool results)'}
`;

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // Traceable to context
      prompt += `- "Traceable" means the information can be found in:
  * Prior user messages
  * Tool outputs
  * Conversation context (established facts)
- Very minor/timeless knowledge is acceptable (e.g., common date formats, standard units)
- Placeholder data (example@mail.com) is a violation
- Specific details (dates, names, numbers) must come from context`;
      break;
    case 1: // Actions have tool calls
      prompt += `- Claims about actions require corresponding tool calls:
  * "I've uploaded the PDF" → needs upload_file tool
  * "I've sent the notification" → needs send_notification tool
  * "I've updated the database" → needs update_database tool
- Distinguish: "I can help..." (okay) vs "I've done..." (needs tool)`;
      break;
    case 2: // Timing of component props
      prompt += `- Component properties should only appear after the data source:
  * User provides data in their message → component can use it
  * Tool returns data in message N → component in message > N can use it
  * Component in message N using data from message N+1 = timing violation`;
      break;
    case 3: // No hallucinated content
      prompt += `- ALL component content must be pulled from conversation:
  * Prop values must appear in prior context or tool outputs
  * No invented/assumed data
  * Check specific values like dates, names, IDs, status values
  * Generic/default values (e.g., "placeholder") are violations`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of what's wrong and why. Include specific message/component/field that failed. Be explicit.",
  "context": "IF FAILED: Relevant context showing the violation. Quote the problematic content and explain what was expected vs what was found.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. What specific content/claim/field failed
2. Where it appears (message number, component, field name)
3. Why it's not traceable (what's missing or wrong)
4. What should be there instead (or what action to take)`;

  return prompt;
}

function isRelevantToChecklistItem(
  violation: TraceabilityViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'untraced_claim': [0, 3],
    'missing_tool_call': [1],
    'timing_issue': [2],
    'hallucinated_content': [3]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}
