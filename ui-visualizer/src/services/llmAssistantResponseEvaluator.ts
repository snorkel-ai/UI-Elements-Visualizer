/**
 * Section 6: Assistant Response Evaluator
 * Verifies responses contain no placeholders, false claims, or redundant info
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { AssistantResponseViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractTextContent, truncateValue, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "The assistant response contains no placeholder data (example@mail.com, website.com)",
  "The assistant response makes no false claims about actions or content",
  "If a tool was called, response includes the UI components from the tool call",
  "No redundant information between response and components",
  "Links have preceding web search when needed",
  "Actions are reasonable and have associated tool calls"
];

export async function evaluateAssistantResponseWithLLM(
  violations: AssistantResponseViolation[],
  conversation: ConversationData,
  config: LlmConfig
): Promise<SectionEvaluation> {
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  const startTime = Date.now();
  let totalTokens = 0;
  let failedCallCount = 0;

  // Parallel evaluation of all checklist items
  const itemResults = await Promise.all(
    CHECKLIST_ITEMS.map(async (checkDescription, itemIndex) => {
      // Filter violations relevant to this checklist item
      const relevantViolations = violations.filter(v =>
        isRelevantToChecklistItem(v, itemIndex)
      );

      if (relevantViolations.length === 0 && !shouldAlwaysCheck(itemIndex)) {
        return {
          checkDescription,
          passed: true,
          severity: 'info' as const
        };
      }

      try {
        // Build prompt for this checklist item
        const prompt = buildAssistantResponsePrompt(
          checkDescription,
          itemIndex,
          relevantViolations,
          conversation
        );

        // Call LLM
        const response = await client.createChatCompletion({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: 'You are validating assistant response quality in conversations. Respond with valid JSON only. Provide detailed explanations and relevant context for any failures.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1,
          max_tokens: 2000
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
        console.error(`LLM call failed for assistant response item ${itemIndex}:`, error.message);
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
    sectionId: '6',
    sectionTitle: 'Assistant Response',
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

function buildAssistantResponsePrompt(
  checkDescription: string,
  itemIndex: number,
  violations: AssistantResponseViolation[],
  conversation: ConversationData
): string {
  let prompt = `
You are evaluating assistant response quality against this criterion:

CHECKLIST ITEM: "${checkDescription}"

ASSISTANT MESSAGES:
${extractAssistantMessagesInfo(conversation)}
`;

  if (violations.length > 0) {
    prompt += `\n\nPOTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => `
${i + 1}. Message ${v.messageIndex} (${v.violationType}):
   Details: ${v.details}
`).join('\n')}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // No placeholders
      prompt += `- Check for placeholder/example data:
  * Email: example@mail.com, user@example.com, contact@domain.com
  * URLs: website.com, example.com, yoursite.com
  * Names: John Doe, Jane Smith
  * Phone: 555-1234, (555) 123-4567
- Placeholders are only acceptable if they appear in prior context or tool outputs`;
      break;
    case 1: // No false claims
      prompt += `- Check for claims about actions without corresponding tool calls:
  * "I've sent the email" → requires send_email tool
  * "I've uploaded the file" → requires upload_file tool
  * "I've created the calendar event" → requires create_event tool
  * "I've updated the database" → requires update_database tool
- Distinguish between "I can help..." (okay) vs "I've done..." (needs tool)`;
      break;
    case 2: // Tool calls include components
      prompt += `- If assistant message has tool calls, it should include UI components that display results
- Tool outputs should be visualized, not just described in text
- Exception: Tool calls for errors or validation don't need components`;
      break;
    case 3: // No redundancy
      prompt += `- Text should not repeat information already shown in components
- Example violation: Text says "The issues are: Topic A (Feb 1), Topic B (Feb 8)" AND component shows same data
- Text should introduce/explain component, not duplicate its content`;
      break;
    case 4: // Links need web search
      prompt += `- External URLs (especially to specific pages/resources) should be preceded by web_search
- Exception: Well-known domains (github.com, docs.python.org) don't need search
- URLs that could be outdated (startup pricing, 2026 events) need verification`;
      break;
    case 5: // Actions have tool calls
      prompt += `- Action-oriented statements should have corresponding tool calls
- Check for verbs like: send, create, update, delete, upload, download, schedule
- "I'll..." or "Let me..." implies action that needs tools`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of what's wrong. Include specific message numbers and exact issues.",
  "context": "IF FAILED: Relevant context showing the violation. Quote problematic text and explain the issue.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. Which message(s) have the issue
2. What specific text/claim/content is problematic
3. Why it violates the criterion
4. What should be done to fix it`;

  return prompt;
}

function extractAssistantMessagesInfo(conversation: ConversationData): string {
  const messages = conversation.conversation;
  let info = '';
  let msgCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant') {
      const textContent = extractTextContent(msg);
      const toolCalls = (msg as any).toolCalls || [];

      // Extract component names
      let componentNames: string[] = [];
      if (Array.isArray(msg.content)) {
        msg.content.forEach((block: any) => {
          if (block.type === 'component' && block.component) {
            componentNames.push(block.component.name);
          }
        });
      }

      // Get prior user message for context
      let priorUserMsg = '';
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === 'user') {
          priorUserMsg = truncateValue(
            typeof messages[j].content === 'string'
              ? messages[j].content
              : JSON.stringify(messages[j].content),
            150
          );
          break;
        }
      }

      info += `\nMessage ${i}:
  Prior user request: ${priorUserMsg || '(none)'}
  Text content: ${truncateValue(textContent, 300) || '(no text)'}
  Tool calls: ${toolCalls.length > 0 ? toolCalls.map((tc: any) => tc.function?.name).join(', ') : '(none)'}
  Components: ${componentNames.length > 0 ? componentNames.join(', ') : '(none)'}
`;
      msgCount++;

      // Limit to 10 messages to avoid token limits
      if (msgCount >= 10) {
        info += '\n... (more messages omitted for brevity)';
        break;
      }
    }
  }

  return info || '(No assistant messages found)';
}

function isRelevantToChecklistItem(
  violation: AssistantResponseViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'placeholder': [0],
    'false_claim': [1],
    'missing_component': [2],
    'redundant': [3],
    'missing_search': [4],
    'unreasonable_action': [5]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}

function shouldAlwaysCheck(itemIndex: number): boolean {
  // Items 0, 1, 3, 4 should always be checked even without pre-identified violations
  return [0, 1, 3, 4].includes(itemIndex);
}
