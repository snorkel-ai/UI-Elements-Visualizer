/**
 * Section 1: Traceability Evaluator
 * Ensures all information traces back to conversation context or tool outputs
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { TraceabilityViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractToolResults, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "Every assistant action, claim, or component field is traceable to a user message, prior context, or a tool output",
  "Every action that requires a tool has a corresponding tool call",
  "Component properties only appear after the User Prompt or context that populates them",
  "All component content is pulled from conversation context, prompts, responses, or tool calls (no hallucinated content)"
];

export async function evaluateTraceabilityWithLLM(
  violations: TraceabilityViolation[],
  conversation: ConversationData,
  config: LlmConfig,
  folderName: string
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
      // Retry up to 5 times on errors
      const maxRetries = 5;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                content: 'You are validating conversation traceability. You MUST respond with ONLY valid JSON - no markdown code blocks, no explanations, no additional text before or after. Your entire response must be parseable as JSON.'
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
            console.log(`[LLMAJ Section 1] Item ${itemIndex} succeeded on attempt ${attempt}`);
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
          console.error(`[LLMAJ Section 1] Item ${itemIndex} attempt ${attempt}/${maxRetries} failed:`, error.message);

          // If not the last attempt, wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      failedCallCount++;
      console.error(`[LLMAJ Section 1] Item ${itemIndex} failed after ${maxRetries} attempts`);
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
  // Build full conversation history with explicit component details
  const conversationHistory = conversation.conversation.map((msg, idx) => {
    let textParts: string[] = [];
    let componentParts: string[] = [];

    if (typeof msg.content === 'string') {
      textParts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      msg.content.forEach((block: any) => {
        if (block.type === 'text') {
          textParts.push(block.text);
        } else if (block.type === 'component') {
          const componentName = block.component?.name || 'unknown';
          const componentProps = block.component?.props ? JSON.stringify(block.component.props, null, 2) : '{}';

          // Extract nested components if present
          let nestedComponentsInfo = '';
          if (block.component?.components && Array.isArray(block.component.components)) {
            nestedComponentsInfo = `\n    Nested Components (${block.component.components.length}):\n`;
            block.component.components.forEach((nested: any, idx: number) => {
              const nestedName = nested.name || 'unknown';
              const nestedProps = nested.props ? JSON.stringify(nested.props, null, 2) : '(no props)';
              nestedComponentsInfo += `      ${idx + 1}. ${nestedName}\n`;
              nestedComponentsInfo += `         Props: ${nestedProps}\n`;
            });
          }

          componentParts.push(`
    *** UI COMPONENT GENERATED: ${componentName} ***
    Props: ${componentProps}${nestedComponentsInfo}
    (This is a visual artifact/UI element that was generated and displayed to the user)
`);
        }
      });
    } else if (msg.content) {
      textParts.push(JSON.stringify(msg.content));
    }

    const toolCalls = (msg as any).toolCalls || [];
    const toolCallInfo = toolCalls.length > 0
      ? `\n  Tool Calls: ${toolCalls.map((tc: any) => tc.function?.name || 'unknown').join(', ')}`
      : '';

    const textContent = textParts.join('\n');

    return `
Message ${idx} (${msg.role}):${toolCallInfo}
  Text: ${textContent || '(no text)'}
${componentParts.length > 0 ? componentParts.join('\n') : ''}
`;
  }).join('\n');

  let prompt = `
You are evaluating conversation traceability against this criterion:

CHECKLIST ITEM: "${checkDescription}"

FULL CONVERSATION HISTORY:
${conversationHistory}

TOOL RESULTS AVAILABLE:
${toolResults.size > 0 ? Array.from(toolResults.entries()).map(([id, result]) => `
  ${id}: ${JSON.stringify(result)}
`).join('\n') : '(No tool results)'}

POTENTIAL VIOLATIONS DETECTED:
${violations.length > 0 ? violations.map((v, i) => `
${i + 1}. Message ${v.messageIndex} (${v.violationType}):
   Content: ${v.content}
   ${v.context ? `Additional context: ${JSON.stringify(v.context)}` : ''}
`).join('\n') : '(No violations pre-detected - perform comprehensive validation)'}

CRITICAL NOTE ON COMPONENT STRUCTURE:
- Components can contain nested child components in a "components" array
- When you see "Nested Components (N):" in the conversation history, this means the component has child components
- Parent components typically provide configuration/labels (e.g., title, description, group labels)
- Child components provide the actual data content (e.g., issue cards, list items, detailed information)
- A component with nested children is NOT missing data - the data is in the nested components
- Example: IssueProgressView (parent with labels) → IssueProgressCard[] (children with issue details)
- ALWAYS check for "Nested Components" section before flagging a component as incomplete or missing data
`;

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // Traceable to context
      prompt += `- "Traceable" means the information can be found in:
  * Prior user messages (PRIMARY SOURCE - components can use data directly from user input)
  * Tool outputs (when external data is fetched)
  * Conversation context (established facts)
- IMPORTANT: If a message includes "*** UI COMPONENT GENERATED ***", the assistant HAS provided a visual artifact
- Text claims like "Here's a board" or "The matrix shows" are NOT hallucinations when accompanied by actual UI components
- CRITICAL: Components can have NESTED CHILD COMPONENTS containing the actual data
  * Parent components typically contain configuration/labels
  * Child components (in "Nested Components" section) contain actual data requested by user
  * Example: IssueProgressView parent with nested IssueProgressCard[] children containing issue details
  * Check BOTH top-level props AND nested components before flagging as missing data
- Very minor/timeless knowledge is acceptable (e.g., common date formats, standard units)
- Placeholder data (example@mail.com) is a violation
- Specific details (dates, names, numbers) must come from context`;
      break;
    case 1: // Actions have tool calls
      prompt += `- Claims about EXTERNAL actions require corresponding tool calls:
  * "I've uploaded the PDF" → needs upload_file tool
  * "I've sent the notification" → needs send_notification tool
  * "I've updated the database" → needs update_database tool
- IMPORTANT: Generating UI components to display user-provided data does NOT require tools
- Phrases like "Here's a board" or "I've created a matrix" are VALID when UI components are actually generated
- Only flag missing tool calls for actions that interact with external systems
- Distinguish: "I can help..." (okay) vs "I've uploaded to your drive..." (needs tool)`;
      break;
    case 2: // Timing of component props
      prompt += `- Component properties should only appear after the data source:
  * User provides data in their message → component can IMMEDIATELY use it (NO TOOL REQUIRED)
  * Tool returns data in message N → component in message > N can use it
  * Component in message N using data from message N+1 = timing violation
- IMPORTANT: Components using data from the current or prior user messages do NOT violate this rule
- IMPORTANT: Check nested child components for data - data in nested components is still valid`;
      break;
    case 3: // No hallucinated content
      prompt += `- ALL component content must be pulled from conversation:
  * Prop values from user messages (MOST COMMON - this is valid!)
  * Prop values from tool outputs (when external data is fetched)
  * No invented/assumed data
  * Check specific values like dates, names, IDs, status values
  * Generic/default values (e.g., "placeholder") are violations
- IMPORTANT: If user provides chore names/schedules in their message, components showing those chores are NOT hallucinations
- CRITICAL: Check nested child components for actual data content
  * Parent components may only have labels/configuration props
  * Nested child components contain the actual requested data (e.g., issue details, card content)
  * Data in nested components counts as provided - NOT hallucinated if grounded in context
  * Example: IssueProgressView parent (labels only) + nested IssueProgressCard[] (issue data) = complete and grounded`;
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
