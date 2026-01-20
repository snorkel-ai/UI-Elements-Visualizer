/**
 * Section 3: Conversation Flow / Turn Logic Evaluator
 * Ensures logical message sequences and proper ordering
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { FlowViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractMessageStructure, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "Flow is logical: User Prompt → Grading Guidance → Tool Call (if applicable) → Tool Output (if applicable) → Assistant Response (may contain UI component)",
  "Assistant message always follows tool call",
  "Tool outputs appear before components that use them"
];

export async function evaluateFlowWithLLM(
  violations: FlowViolation[],
  conversation: ConversationData,
  config: LlmConfig,
  folderName: string
): Promise<SectionEvaluation> {
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  console.log('[LLMAJ Section 3: Conversation Flow] Evaluation starting...');
  const startTime = Date.now();
  let totalTokens = 0;
  let failedCallCount = 0;

  // Extract message structure (lightweight)
  const messageStructure = extractMessageStructure(conversation);

  // Parallel evaluation of all checklist items
  const itemResults = await Promise.all(
    CHECKLIST_ITEMS.map(async (checkDescription, itemIndex) => {
      // Filter violations relevant to this checklist item
      const relevantViolations = violations.filter(v =>
        isRelevantToChecklistItem(v, itemIndex)
      );

      // Always call LLM for comprehensive validation, even when no violations detected
      // Retry up to 5 times on errors
      const maxRetries = 5;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Build prompt for this checklist item
          const prompt = buildFlowPrompt(
            checkDescription,
            itemIndex,
            relevantViolations,
            messageStructure
          );

          // Call LLM
          const response = await client.createChatCompletion({
            model: config.model,
            messages: [
              {
                role: 'system',
                content: 'You are validating conversation flow and turn logic. You MUST respond with ONLY valid JSON - no markdown code blocks, no explanations, no additional text before or after. Your entire response must be parseable as JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 16000,
            metadata: {
              run_id: folderName
            }
          });

          totalTokens += (response.usage?.total_tokens || 0);

          // Parse response
          const evaluation = parseLlmResponse(response.choices[0].message.content);

          // If we get here without error, return successfully
          if (attempt > 1) {
            console.log(`[LLMAJ Section 3] Item ${itemIndex} succeeded on attempt ${attempt}`);
          }

          return {
            checkDescription,
            passed: evaluation.passed,
            failureReason: evaluation.passed ? undefined : evaluation.failureReason,
            context: evaluation.passed ? undefined : evaluation.context,
            severity: evaluation.severity || 'warning'
          } as CheckItemResult;
        } catch (error: any) {
          lastError = error;
          console.error(`[LLMAJ Section 3] Item ${itemIndex} attempt ${attempt}/${maxRetries} failed:`, error.message);

          // If not the last attempt, wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      failedCallCount++;
      console.error(`[LLMAJ Section 3] Item ${itemIndex} failed after ${maxRetries} attempts`);
      return {
        checkDescription,
        passed: false,
        failureReason: `LLM evaluation failed after ${maxRetries} attempts: ${lastError?.message}`,
        context: `Violations detected: ${relevantViolations.length}`,
        severity: 'warning' as const
      } as CheckItemResult;
    })
  );

  return {
    sectionId: '3',
    sectionTitle: 'Conversation Flow',
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

function buildFlowPrompt(
  checkDescription: string,
  itemIndex: number,
  violations: FlowViolation[],
  messageStructure: any[]
): string {
  let prompt = `
You are evaluating conversation flow against this criterion:

CHECKLIST ITEM: "${checkDescription}"

FULL MESSAGE SEQUENCE:
${messageStructure.map(m => {
  let content = '';
  if (typeof m.fullContent === 'string') {
    content = m.fullContent;
  } else if (Array.isArray(m.fullContent)) {
    content = m.fullContent.map((block: any) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'component') return `[Component: ${block.component?.name || 'unknown'}]`;
      return '';
    }).join('\n');
  } else {
    content = JSON.stringify(m.fullContent);
  }

  return `
Message ${m.index} (${m.role}):
  Content: ${content.substring(0, 500)}${content.length > 500 ? '...' : ''}
  - Has grading guidance: ${m.hasGradingGuidance}
  - Has tool calls: ${m.hasToolCalls} (${m.toolCallCount} calls)
  - Has components: ${m.hasComponents} (${m.componentNames.join(', ')})
`;
}).join('\n')}
`;

  if (violations.length > 0) {
    prompt += `\n\nPOTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => `
${i + 1}. Flow issue at messages ${v.messageIndices.join(', ')} (${v.violationType}):
   Expected: ${v.expectedFlow}
   Actual: ${v.actualFlow}
`).join('\n')}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // Logical flow
      prompt += `- Standard flow: User → [Grading Guidance] → [Tool Call] → [Tool Output] → Assistant → [Component]
- User messages should have grading_guidance
- If tools are used, flow is: Tool Call message → Tool Output message → Assistant message
- Tool call messages are often role=assistant with toolCalls but no content
- Tool output messages are role=tool
- No user message should directly follow a tool output (assistant must summarize first)`;
      break;
    case 1: // Assistant after tool call
      prompt += `- Every set of tool calls must be followed by an assistant message
- IMPORTANT: If an assistant message has N tool calls, it's valid (and expected) to have N consecutive tool messages following it
- Example: Assistant with 2 tool calls → Tool message 1 → Tool message 2 → Assistant response (VALID)
- Tool messages are invisible to users, so assistant must eventually summarize/respond
- Check: After all tool messages from a multi-tool-call assistant message, next message should be role=assistant
- Empty assistant responses after tool calls are violations`;
      break;
    case 2: // Tool outputs before components
      prompt += `- ONLY applies when components use data from tool calls
- IMPORTANT: Components can get data from user messages WITHOUT tools - this is VALID and COMMON
- If NO tools are called in the conversation, this check PASSES automatically
- If tools ARE called AND a component uses that tool's data, the tool output must appear before the component
- Check component message indices against tool output message indices ONLY when tools are involved
- Example violation: Component at message 8 references tool output from message 10
- Example VALID: User provides schedule data in message 1 → Component shows that schedule in message 2 (NO TOOL NEEDED)`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of the flow violation. Include specific message numbers and what's wrong with the sequence.",
  "context": "IF FAILED: Relevant context showing the flow issue. Quote the message sequence and explain why it violates the expected flow.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. Which message numbers are involved in the flow violation
2. What the actual sequence is (role, has_tools, has_components)
3. Why this sequence violates the expected flow
4. What the correct sequence should be (e.g., insert assistant message after message X)`;

  return prompt;
}

function isRelevantToChecklistItem(
  violation: FlowViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'incorrect_sequence': [0],
    'missing_assistant_response': [1],
    'timing_issue': [2]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}
