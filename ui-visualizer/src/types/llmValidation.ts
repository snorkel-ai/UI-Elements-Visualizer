/**
 * Type definitions for LLM-based validation
 */

/**
 * Details of a validation violation to be evaluated by LLM
 */
export interface ViolationDetail {
  messageIndex: number;
  componentName: string;
  propName: string;
  propValue: any;
}

/**
 * Context information for LLM evaluation
 */
export interface EvaluationContext {
  componentName: string;
  propName: string;
  propValue: any;
  messageIndex: number;
  precedingMessages: Array<{
    role: string;
    content: any;
    toolCalls?: any[];
  }>;
  toolResults: Map<string, any>;
}

/**
 * LLM's evaluation result for a single violation
 */
export interface LlmEvaluationResult {
  approved: boolean;
  reasoning: string;
  category: 'hardcoded' | 'transformation' | 'derived' | 'unclear';
}

/**
 * Aggregated results from evaluating multiple violations
 */
export interface AggregatedEvaluation {
  approvedCount: number;
  rejectedCount: number;
  details: Array<{
    violation: string;
    approved: boolean;
    reasoning: string;
    category: string;
  }>;
}

/**
 * OpenAI API message format
 */
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API request format
 */
export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
  metadata?: Record<string, string>;
}

/**
 * OpenAI API response format
 */
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * =================================================================
 * NEW: Type definitions for 6 LLMAJ validation sections
 * =================================================================
 */

/**
 * Common evaluation result for all sections
 */
export interface CheckItemResult {
  checkDescription: string;
  passed: boolean;
  failureReason?: string; // Detailed explanation why it failed
  context?: string; // Relevant context for failure
  severity: 'critical' | 'warning' | 'info';
}

/**
 * Section evaluation result
 */
export interface SectionEvaluation {
  sectionId: string;
  sectionTitle: string;
  passed: boolean;
  checkItemResults: CheckItemResult[];
  metadata: {
    llmCallCount: number;
    totalTokens: number;
    evaluationTimeMs: number;
    failedCallCount?: number; // Track LLM failures
  };
}

/**
 * Section 1: Traceability violations
 */
export interface TraceabilityViolation {
  messageIndex: number;
  violationType: 'untraced_claim' | 'missing_tool_call' | 'timing_issue' | 'hallucinated_content';
  content: string;
  context: any;
}

/**
 * Section 2: Tool Correctness violations
 */
export interface ToolCorrectnessViolation {
  toolName: string;
  messageIndices: number[];
  violationType: 'inconsistent_definition' | 'unnecessary_tool' | 'incorrect_flag' | 'sequential_issue';
  details: string;
}

/**
 * Section 3: Conversation Flow violations
 */
export interface FlowViolation {
  messageIndices: number[];
  violationType: 'incorrect_sequence' | 'missing_assistant_response' | 'timing_issue';
  expectedFlow: string;
  actualFlow: string;
}

/**
 * Section 4: Component Quality violations (merged from sections 4 and 7)
 */
export interface ComponentQualityViolation {
  componentName: string;
  messageIndex: number;
  violationType: 'interactive' | 'overfit' | 'ungrounded' | 'irrelevant' | 'timing' | 'schema_mismatch' | 'hallucinated' | 'not_expected';
  details: string;
}

/**
 * Section 5: Grading Guidance violations
 */
export interface GradingGuidanceViolation {
  turnIndex: number;
  violationType: 'not_turn_specific' | 'not_natural_language' | 'should_be_empty' | 'mismatch';
  details: string;
}

/**
 * Section 6: Assistant Response violations
 */
export interface AssistantResponseViolation {
  messageIndex: number;
  violationType: 'placeholder' | 'false_claim' | 'missing_component' | 'redundant' | 'missing_search' | 'unreasonable_action';
  details: string;
}

/**
 * Helper types for shared utilities
 */

export interface MessageStructure {
  index: number;
  role: string;
  fullContent: any; // Full message content (string or array of content blocks)
  hasGradingGuidance: boolean;
  hasToolCalls: boolean;
  hasComponents: boolean;
  componentNames: string[];
  toolCallCount: number;
}

export interface ToolCallSummary {
  name: string;
  arguments: any;
  messageIndex: number;
}

export interface ComponentSummary {
  name: string;
  props: any;
  messageIndex: number;
  nestedComponents?: Array<{
    name: string;
    props?: any;
  }>;
}
