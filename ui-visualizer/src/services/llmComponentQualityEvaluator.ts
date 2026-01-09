/**
 * Section 4 (merged with 7): Component Quality Evaluator
 * Verifies components are non-interactive, generalizable, grounded, relevant, and match schemas
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { ComponentQualityViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { extractComponentsFromMessage, buildWindowedContext, findComponentInSchema, getExpectedComponents, truncateValue, parseLlmResponse } from './llmEvaluatorUtils';

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
              content: 'You are validating component quality in conversations. Respond with valid JSON only. Provide detailed explanations and relevant context for any failures.'
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
        console.error(`LLM call failed for component quality item ${itemIndex}:`, error.message);
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
- No assumed/invented content`;
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
  * Prop types align with schema types`;
      break;
    case 6: // Not hallucinated
      prompt += `- All component information must be traceable to conversation
- Check specific prop values against context/tool outputs
- No invented data (dates, names, IDs, statuses)
- Each field should have clear source in prior messages`;
      break;
    case 7: // In expected components
      prompt += `- Component must be listed in grading_guidance.expected_components
- Check component name matches expected list
- If not in list = violation (either add to GG or remove component)`;
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
        // Get context window
        const contextWindow = buildWindowedContext(conversation, i, 2);

        // Get expected components from prior user message
        let expectedComponents: string[] = [];
        for (let j = i - 1; j >= 0; j--) {
          if (messages[j].role === 'user') {
            expectedComponents = getExpectedComponents(messages[j]);
            break;
          }
        }

        components.forEach(comp => {
          const componentSchema = findComponentInSchema(comp.name, schema);

          info += `\nComponent: ${comp.name} (Message ${i})
  Props: ${JSON.stringify(truncateValue(comp.props, 500), null, 2)}
  Expected by GG: ${expectedComponents.includes(comp.name) ? 'YES' : 'NO (expected: ' + expectedComponents.join(', ') + ')'}
  Has schema definition: ${componentSchema ? 'YES' : 'NO'}
  Context (2 prior messages): ${contextWindow.map(m => `${m.role}: ${truncateValue(m.content, 150)}`).join(' | ')}
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

function shouldAlwaysCheck(itemIndex: number): boolean {
  // Items 0, 2, 6, 7 should always be checked even without pre-identified violations
  return [0, 2, 6, 7].includes(itemIndex);
}
