/**
 * Section 6: Assistant Response Evaluator
 * Verifies responses contain no placeholders, false claims, or redundant info
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { AssistantResponseViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractTextContent, parseLlmResponse } from './llmEvaluatorUtils';

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
  config: LlmConfig,
  folderName: string
): Promise<SectionEvaluation> {
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  console.log('[LLMAJ Section 6: Assistant Response] Evaluation starting...');
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

      // Always call LLM for comprehensive validation, even when no violations detected
      // Retry up to 5 times on errors
      const maxRetries = 5;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                content: 'You are validating assistant response quality in conversations. You MUST respond with ONLY valid JSON - no markdown code blocks, no explanations, no additional text before or after. Your entire response must be parseable as JSON. Always include all required fields: passed, failureReason, context, severity.'
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
            console.log(`[LLMAJ Section 6] Item ${itemIndex} succeeded on attempt ${attempt}`);
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
          console.error(`[LLMAJ Section 6] Item ${itemIndex} attempt ${attempt}/${maxRetries} failed:`, error.message);

          // If not the last attempt, wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      failedCallCount++;
      console.error(`[LLMAJ Section 6] Item ${itemIndex} failed after ${maxRetries} attempts`);
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
      prompt += `- Check for claims about EXTERNAL actions without corresponding tool calls:
  * "I've sent the email" → requires send_email tool
  * "I've uploaded the file" → requires upload_file tool
  * "I've created the calendar event" → requires create_event tool
  * "I've updated the database" → requires update_database tool
- IMPORTANT: Generating UI components to display user-provided data does NOT require tool calls
- Phrases like "Here's a board" or "I've created a matrix" are VALID when UI components are present in the message
- Only flag missing tool calls for actions that interact with external systems
- Distinguish between "I can help..." (okay) vs "I've uploaded to your drive..." (needs tool)`;
      break;
    case 2: // Tool calls include components
      prompt += `- IMPORTANT: This check only applies to messages that make tool calls
- If NO tool calls are made in the conversation, this check PASSES automatically
- When an assistant message includes tool calls for data retrieval/generation:
  * The assistant's response (after tool output) should include UI components to visualize the data
  * Simply describing the results in text is not sufficient
  * Exception: Error-handling tools, validation tools, or simple lookups don't need components
- Example PASS: Message has tool call 'get_schedule' → Response includes ScheduleBoard component
- Example FAIL: Message has tool call 'get_schedule' → Response only says "Here are the results: ..." without component
- Example PASS (no violation): No tool calls made, assistant generates components from user data
- Look for patterns: Tool Call → Tool Output → Assistant Message with/without components`;
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
      prompt += `- EXTERNAL action-oriented statements should have corresponding tool calls
- Check for verbs that interact with external systems: send (email), upload, download, schedule (external calendar)
- IMPORTANT: "Create", "generate", "show", "display" UI components do NOT require external tool calls
- "I'll..." or "Let me..." for external actions needs tools
- Examples that DON'T need tools: "I'll create a board", "Let me show you a schedule", "I've generated a matrix" (when UI components are present)
- Examples that DO need tools: "I'll send this to your email", "Let me upload to your drive", "I've scheduled this in your calendar"`;
      break;
  }

  prompt += `\n\nRESPOND WITH VALID JSON ONLY:

If validation passes:
{
  "passed": true,
  "failureReason": "",
  "context": "",
  "severity": "info"
}

If validation fails:
{
  "passed": false,
  "failureReason": "Detailed explanation of what's wrong. Include specific message numbers and exact issues.",
  "context": "Relevant context showing the violation. Quote problematic text and explain the issue.",
  "severity": "critical" | "warning" | "info"
}

CRITICAL INSTRUCTIONS:
- You MUST respond with valid JSON - no markdown code blocks, no explanatory text
- If the checklist item doesn't apply (e.g., no tool calls when checking tool-related criteria), respond with passed: true
- Always include all four fields: passed, failureReason, context, severity
- Use empty strings for failureReason and context when passed is true
- If failed, provide detailed failureReason and context that clearly explains:
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
          const content = typeof messages[j].content === 'string'
            ? messages[j].content
            : JSON.stringify(messages[j].content);
          priorUserMsg = content.substring(0, 500) + (content.length > 500 ? '...' : '');
          break;
        }
      }

      const fullTextContent = textContent.substring(0, 1000) + (textContent.length > 1000 ? '...' : '');

      // Check if there are tool outputs following this message (for context about tool usage)
      let hasToolOutputsAfter = false;
      for (let k = i + 1; k < Math.min(i + 5, messages.length); k++) {
        if (messages[k].role === 'tool') {
          hasToolOutputsAfter = true;
          break;
        }
        if (messages[k].role === 'user' || messages[k].role === 'assistant') {
          break;
        }
      }

      const toolCallInfo = toolCalls.length > 0
        ? `${toolCalls.map((tc: any) => tc.function?.name).join(', ')} (followed by tool outputs: ${hasToolOutputsAfter ? 'YES' : 'NO'})`
        : '(none)';

      info += `\nMessage ${i}:
  Prior user request: ${priorUserMsg || '(none)'}
  Text content: ${fullTextContent || '(no text)'}
  Tool calls: ${toolCallInfo}
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

