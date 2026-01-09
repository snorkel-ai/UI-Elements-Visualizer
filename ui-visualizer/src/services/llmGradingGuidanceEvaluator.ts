/**
 * Section 5: Grading Guidance / Expected Components Evaluator
 * Ensures grading guidance is turn-specific and matches actual components
 */

import { OpenAIClient } from './openaiClient';
import type { LlmConfig } from '../config/llmConfig';
import type { ConversationData } from '../types';
import type { GradingGuidanceViolation, SectionEvaluation, CheckItemResult } from '../types/llmValidation';
import { truncateValue, parseLlmResponse, getExpectedComponents } from './llmEvaluatorUtils';

const CHECKLIST_ITEMS = [
  "Grading guidance is adapted per user turn, not for the whole conversation",
  "Expected components are described in natural language (not strict lists)",
  "Expected components are empty when none should appear",
  "Expected components match what's actually provided"
];

export async function evaluateGradingGuidanceWithLLM(
  violations: GradingGuidanceViolation[],
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

      if (relevantViolations.length === 0) {
        return {
          checkDescription,
          passed: true,
          severity: 'info' as const
        };
      }

      try {
        // Build prompt for this checklist item
        const prompt = buildGradingGuidancePrompt(
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
              content: 'You are validating grading guidance quality in conversations. Respond with valid JSON only. Provide detailed explanations and relevant context for any failures.'
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
        console.error(`LLM call failed for grading guidance item ${itemIndex}:`, error.message);
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
    sectionId: '5',
    sectionTitle: 'Grading Guidance',
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

function buildGradingGuidancePrompt(
  checkDescription: string,
  itemIndex: number,
  violations: GradingGuidanceViolation[],
  conversation: ConversationData
): string {
  let prompt = `
You are evaluating grading guidance quality against this criterion:

CHECKLIST ITEM: "${checkDescription}"

USER TURNS WITH GRADING GUIDANCE:
${extractTurnsInfo(conversation)}
`;

  if (violations.length > 0) {
    prompt += `\n\nPOTENTIAL VIOLATIONS DETECTED:
${violations.map((v, i) => `
${i + 1}. Turn ${v.turnIndex} (${v.violationType}):
   Details: ${v.details}
`).join('\n')}`;
  }

  prompt += `\n\nEVALUATION CRITERIA:

`;

  // Item-specific criteria
  switch (itemIndex) {
    case 0: // Turn-specific
      prompt += `- Grading guidance should be specific to this turn's request, not the entire conversation
- Check for phrases like "throughout the conversation", "all issues", "entire backlog"
- GG should focus on what THIS turn asks for and how THIS turn's response should be evaluated
- Example violation: Turn asks "Show this week" but GG says "Displays all issues from backlog"`;
      break;
    case 1: // Natural language
      prompt += `- Expected components should be described naturally, not as strict lists
- Good: "A calendar view component and individual issue cards"
- Bad: ["CalendarBoard", "IssueCard"]
- Allow flexibility in phrasing and description style`;
      break;
    case 2: // Empty when appropriate
      prompt += `- expected_components should be empty array [] when turn doesn't need components
- Clarifying questions, simple text responses, errors = no components expected
- Example: User asks "Which format?" → assistant asks clarifying question → expected_components: []`;
      break;
    case 3: // Matches actual
      prompt += `- Expected components in GG must match what's actually provided in assistant response
- Check component names and types align between expected and actual
- Mismatch examples:
  * GG expects "CalendarBoard" but response has "IssueList"
  * GG expects no components but response includes "StatusCard"`;
      break;
  }

  prompt += `\n\nRESPOND WITH JSON:
{
  "passed": true/false,
  "failureReason": "IF FAILED: Detailed explanation of what's wrong. Include specific turn numbers and exact issues.",
  "context": "IF FAILED: Relevant context showing the violation. Quote grading guidance text and explain the problem.",
  "severity": "critical" | "warning" | "info"
}

IMPORTANT: If failed, provide detailed failureReason and context that clearly explains:
1. Which turn(s) have the grading guidance issue
2. What the grading guidance says
3. Why it violates the criterion
4. What it should say instead`;

  return prompt;
}

function extractTurnsInfo(conversation: ConversationData): string {
  const messages = conversation.conversation;
  let turnsInfo = '';
  let turnIndex = 0;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const gg = (msg as any).grading_guidance;
      const nextMsg = messages[i + 1];

      // Get components from next assistant message
      let componentNames: string[] = [];
      if (nextMsg && nextMsg.role === 'assistant' && Array.isArray(nextMsg.content)) {
        nextMsg.content.forEach((block: any) => {
          if (block.type === 'component' && block.component) {
            componentNames.push(block.component.name);
          }
        });
      }

      const expectedComponents = getExpectedComponents(msg);

      turnsInfo += `\nTurn ${turnIndex}:
  User message: ${truncateValue(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content), 200)}
  Expected components: ${expectedComponents.length > 0 ? expectedComponents.join(', ') : '(none)'}
  Actual components: ${componentNames.length > 0 ? componentNames.join(', ') : '(none)'}
  Quality criteria: ${gg?.quality_criteria ? truncateValue(JSON.stringify(gg.quality_criteria), 300) : '(none)'}
`;
      turnIndex++;
    }
  }

  return turnsInfo || '(No user turns with grading guidance found)';
}

function isRelevantToChecklistItem(
  violation: GradingGuidanceViolation,
  itemIndex: number
): boolean {
  // Map violation types to checklist items
  const mapping: Record<string, number[]> = {
    'not_turn_specific': [0],
    'not_natural_language': [1],
    'should_be_empty': [2],
    'mismatch': [3]
  };

  return mapping[violation.violationType]?.includes(itemIndex) || false;
}
