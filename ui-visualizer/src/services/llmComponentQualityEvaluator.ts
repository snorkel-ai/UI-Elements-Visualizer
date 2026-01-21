/**
 * Section 4 (merged with 7): Component Quality Evaluator
 * Verifies components are non-interactive, generalizable, grounded, relevant, and match schemas
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { ComponentQualityViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractComponentsFromMessage, findComponentInSchema, getExpectedComponents, parseLlmResponse } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "The UI elements do not contain any elements that are or appear that they would be interactive",
  "Components are generalizable and not overfit to a single scenario",
  "Component content is grounded in prior conversation context",
  "Components are only present when relevant to the current turn",
  "If a tool message generates a UI component, it must be followed by that component",
  "The UI element matches tool call properties and componentSchema JSON",
  "All information in UI elements is pulled from conversation context (not hallucinated)",
  "The UI element appears in Expected Components of GG"
];

export async function evaluateComponentQualityWithLLM(
  violations: ComponentQualityViolation[],
  conversation: ConversationData,
  config: LlmConfig,
  folderName: string
): Promise<SectionEvaluation> {
  const client = new OpenAIClient(config.apiKey!, config.timeout);
  console.log('[LLMAJ Section 4: Component Quality] Evaluation starting...');
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
          const prompt = buildComponentQualityPrompt(
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
                content: 'You are validating component quality in conversations. You MUST respond with ONLY valid JSON - no markdown code blocks, no explanations, no additional text before or after. Your entire response must be parseable as JSON.'
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
            console.log(`[LLMAJ Section 4] Item ${itemIndex} succeeded on attempt ${attempt}`);
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
          console.error(`[LLMAJ Section 4] Item ${itemIndex} attempt ${attempt}/${maxRetries} failed:`, error.message);

          // If not the last attempt, wait before retrying (exponential backoff)
          if (attempt < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10s
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      failedCallCount++;
      console.error(`[LLMAJ Section 4] Item ${itemIndex} failed after ${maxRetries} attempts`);
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
    sectionId: '4',
    sectionTitle: 'Component Quality',
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

function buildComponentQualityPrompt(
  checkDescription: string,
  itemIndex: number,
  violations: ComponentQualityViolation[],
  conversation: ConversationData
): string {
  let prompt = `
You are evaluating component quality against this criterion:

CHECKLIST ITEM: "${checkDescription}"

COMPONENTS IN CONVERSATION:
${extractComponentsInfo(conversation)}

IMPORTANT NOTE ON COMPONENT STRUCTURE:
- Components can contain nested child components in a "components" array field
- Parent components provide configuration/labels via props (e.g., titles, descriptions)
- Child components provide the actual data/content (e.g., issue cards, list items)
- A component with nested children is NOT missing data - the data is in the nested components
- Example: IssueProgressView (parent with labels) → IssueProgressCard[] (children with issue data)
- Always check for nested components before flagging a component as incomplete
`;

  if (violations.length > 0) {
    prompt += `\n\nPOTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => `
${i + 1}. Component "${v.componentName}" at message ${v.messageIndex} (${v.violationType}):
   Details: ${v.details}
`).join('\n')}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // No interactive elements
      prompt += `- Check for interactive elements in component definitions:
  * Buttons with onClick handlers
  * Input fields, text areas, forms
  * Links with href or click handlers
  * Dropdowns, selects, checkboxes
  * Drag and drop functionality
- Purely visual elements are okay (styled divs, icons, badges)`;
      break;
    case 1: // Generalizable
      prompt += `- Components should be reusable across scenarios, not overfit to one case
- Check for:
  * Hardcoded specific values (e.g., only works for "Q1 2024")
  * Single-use structure
  * Over-specific naming or logic
- Good: Generic card that displays any issue
- Bad: Card hardcoded for only calendar issues`;
      break;
    case 2: // Grounded in context
      prompt += `- Component content must come from conversation context
- Check that component props reference:
  * User's input/request
  * Tool outputs
  * Prior established facts
- No assumed/invented content
- IMPORTANT: Check BOTH top-level props AND nested components for requested data
  * Parent components may only contain labels/configuration
  * Nested child components contain the actual data requested by user
  * Example: User requests "show issue cards" → IssueProgressView (parent) contains nested IssueProgressCard[] (children with issue data)
  * A component IS grounded if nested children contain the requested information`;
      break;
    case 3: // Relevant to turn
      prompt += `- Components should only appear when needed for current turn's response
- Check if component addresses current user request
- Irrelevant components = violation
- Example: User asks about schedule, component shows unrelated metrics`;
      break;
    case 4: // Tool generates component
      prompt += `- If assistant makes tool call for data, response should include component showing that data
- Tool calls for visualization/display purposes need corresponding components
- Exceptions: Error-handling tools, validation tools`;
      break;
    case 5: // Matches schema
      prompt += `- Component structure must match componentSchema definition
- Check:
  * Component name exists in schema
  * Props match schema properties
  * Required props are present
  * Prop types align with schema types
- IMPORTANT: Components can have nested child components in a "components" array
  * Example: IssueProgressView with nested IssueProgressCard children
  * Data can be provided through nested components, not just top-level props
  * Check the FULL component structure including nested components
  * A component is NOT missing data if it provides data through nested child components`;
      break;
    case 6: // Not hallucinated
      prompt += `- All component information must be traceable to conversation
- Check specific prop values against context/tool outputs (including nested components)
- No invented data (dates, names, IDs, statuses)
- Each field should have clear source in prior messages
- IMPORTANT: Check nested child components for data content, not just parent props
  * Parent component props typically contain labels/configuration
  * Nested components contain actual data (e.g., IssueProgressCard[] inside IssueProgressView)
  * Verify nested component data is grounded in conversation context`;
      break;
    case 7: // In expected components
      prompt += `- IMPORTANT: expected_components uses NATURAL LANGUAGE descriptions, not exact component names
- Check if the component SEMANTICALLY MATCHES the natural language description
- Examples of VALID matches:
  * Component "NewsletterContentCalendar" matches description "A weekly calendar-style layout..."
  * Component "IssueCard" matches description "A set of issue cards..."
  * Component "BacklogIdeaList" matches description "A backlog section..."
- Do NOT require exact name matching - focus on whether the component fulfills the described purpose
- Only flag as violation if component has NO semantic match in expected_components
- If expected_components describes "a calendar" and component is "CalendarBoard" → PASS
- If expected_components describes "user profile cards" and component is "ProductList" → FAIL (semantic mismatch)`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of what's wrong. Include specific component names, props, and exact issues.",
  "context": "IF FAILED: Relevant context showing the violation. Quote problematic code/props and explain why it fails this criterion.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. Which specific component(s) violated the criterion
2. What specific part is problematic (prop, element, structure)
3. Why it's a violation
4. What should be done to fix it`;

  return prompt;
}

function extractComponentsInfo(conversation: ConversationData): string {
  const messages = conversation.conversation;
  const schema = conversation.componentsSchema;
  let info = '';
  let componentCount = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'assistant') {
      const components = extractComponentsFromMessage(msg, i);

      if (components.length > 0) {
        // Get full user request and tool calls for context
        let priorUserRequest = '';
        let expectedComponents: string[] = [];
        let toolCallsInContext: any[] = [];

        // Look back to find user message and any tool calls between
        for (let j = i - 1; j >= 0; j--) {
          const priorMsg = messages[j];
          if (priorMsg.role === 'assistant' && (priorMsg as any).toolCalls) {
            toolCallsInContext = (priorMsg as any).toolCalls || [];
          }
          if (priorMsg.role === 'user') {
            const content = typeof priorMsg.content === 'string'
              ? priorMsg.content
              : JSON.stringify(priorMsg.content);
            priorUserRequest = content;
            expectedComponents = getExpectedComponents(priorMsg);
            break;
          }
        }

        components.forEach(comp => {
          const componentSchema = findComponentInSchema(comp.name, schema);
          const propsJson = JSON.stringify(comp.props, null, 2);

          // Check if component name exactly matches expected (rare) or if we need semantic matching
          const exactMatch = expectedComponents.includes(comp.name);
          const expectedDescriptions = expectedComponents.length > 0
            ? `Expected (natural language): ${expectedComponents.join(' | ')}`
            : 'Expected: (none)';

          // Format nested components if present
          let nestedComponentsInfo = '';
          if (comp.nestedComponents && comp.nestedComponents.length > 0) {
            nestedComponentsInfo = `\n  Nested components (${comp.nestedComponents.length}):\n`;
            comp.nestedComponents.forEach((nested, idx) => {
              const nestedPropsJson = nested.props ? JSON.stringify(nested.props, null, 2) : '(no props)';
              nestedComponentsInfo += `    ${idx + 1}. ${nested.name}\n`;
              nestedComponentsInfo += `       Props: ${nestedPropsJson}\n`;
            });
          }

          info += `\nComponent: ${comp.name} (Message ${i})
  Props: ${propsJson}${nestedComponentsInfo}
  ${expectedDescriptions}
  Exact name match: ${exactMatch ? 'YES' : 'NO (requires semantic match)'}
  Has schema definition: ${componentSchema ? 'YES' : 'NO'}
  User request: ${priorUserRequest || '(none)'}
  Tool calls before component: ${toolCallsInContext.length > 0 ? toolCallsInContext.map((tc: any) => tc.function?.name).join(', ') : '(none)'}
`;

          componentCount++;
          // Limit to 10 components to avoid token limits
          if (componentCount >= 10) {
            info += '\n... (more components omitted for brevity)';
            return info;
          }
        });
      }
    }
  }

  return info || '(No components found in conversation)';
}

function isRelevantToChecklistItem(
  violation: ComponentQualityViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'interactive': [0],
    'overfit': [1],
    'ungrounded': [2],
    'irrelevant': [3],
    'timing': [4],
    'schema_mismatch': [5],
    'hallucinated': [6],
    'not_expected': [7]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}

