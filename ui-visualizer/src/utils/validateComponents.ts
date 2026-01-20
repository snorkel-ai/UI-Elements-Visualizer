import { DataPoint, ConversationData } from '../types';
import { ParsedComponent } from './parseComponents';
import { parseComponents } from './parseComponents';

export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: string[];
  metadata?: {
    llmAssisted?: boolean;
    originalViolationCount?: number;
    llmApprovedCount?: number;
    llmRejectedCount?: number;
    llmDetails?: Array<{
      violation: string;
      approved: boolean;
      reasoning: string;
      category: string;
    }>;
    // NEW: Additional metadata for LLMAJ validators
    llmCallCount?: number;
    totalTokens?: number;
    evaluationFailed?: boolean;
    error?: string;
  };
}

export interface ValidationReport {
  allPassed: boolean;
  results: ValidationResult[];
}

/**
 * Configuration options for string matching in props source validation
 */
export interface MatchingOptions {
  minStringLength: number;           // Minimum length for a string to be considered for matching
  minComplexStringLength: number;    // Minimum length for a string to be considered "complex"
  minTokenLength: number;            // Minimum token length to include in comparison
  tokenOverlapThreshold: number;     // Minimum percentage of tokens that must match (0.0 - 1.0)
  numericEpsilon: number;            // Tolerance for numeric comparisons (for floating point precision)
  enableTokenMatching: boolean;      // Enable/disable token-based matching
  enableStructuralExtraction: boolean; // Enable/disable structural extraction matching
}

const DEFAULT_MATCHING_OPTIONS: MatchingOptions = {
  minStringLength: 10,
  minComplexStringLength: 30,
  minTokenLength: 3,
  tokenOverlapThreshold: 0.4,
  numericEpsilon: 0.01,
  enableTokenMatching: true,
  enableStructuralExtraction: true
};

/**
 * Validates a single data point asynchronously (for dashboard use)
 */
export async function validateDataPoint(dataPoint: DataPoint): Promise<ValidationReport> {
  let componentsContent = '';
  let parsedComponents: ParsedComponent[] = [];

  // Load components.ts if available
  if (dataPoint.componentsPath) {
    try {
      const response = await fetch(dataPoint.componentsPath);
      if (response.ok) {
        componentsContent = await response.text();
        parsedComponents = parseComponents(componentsContent);
      }
    } catch (e) {
      // Silently fail - validation will handle missing components
    }
  }

  return await validateComponents(dataPoint, parsedComponents, componentsContent);
}

/**
 * Validates component definitions against the specified rules
 * Now async to support LLM-based validation
 */
export async function validateComponents(
  dataPoint: DataPoint,
  parsedComponents: ParsedComponent[],
  componentsContent: string
): Promise<ValidationReport> {
  const results: ValidationResult[] = [];

  // Check 1: No "export interface" - should be just "interface"
  const exportInterfaceCheck = checkNoExportInterface(componentsContent);
  results.push(exportInterfaceCheck);

  // Check 2: No ReactNode attributes
  const reactNodeCheck = checkNoReactNode(parsedComponents);
  results.push(reactNodeCheck);

  // Check 3: All interface attributes match component schema
  const schemaMatchCheck = checkSchemaMatch(dataPoint.conversation, parsedComponents);
  results.push(schemaMatchCheck);

  // Check 4: All props in conversation match component schema params
  const propsMatchCheck = checkPropsMatchSchema(dataPoint.conversation);
  results.push(propsMatchCheck);

  // Check 5: No components with props before User Prompt
  const propsBeforeUPCheck = checkPropsBeforeUserPrompt(dataPoint.conversation);
  results.push(propsBeforeUPCheck);

  // Check 6: No interactive elements in components
  const interactiveElementsCheck = checkNoInteractiveElements(parsedComponents, componentsContent);
  results.push(interactiveElementsCheck);

  // Check 7: No AssistantMessage with both content/components AND tool_calls
  const assistantMessageStructureCheck = checkAssistantMessageStructure(dataPoint.conversation);
  results.push(assistantMessageStructureCheck);

  // Check 8: Component props source clarity (async)
  const propsSourceCheck = await checkComponentPropsSource(dataPoint.conversation);
  results.push(propsSourceCheck);

  // Check 9: Grading guidance structure
  const gradingGuidanceCheck = checkGradingGuidanceStructure(dataPoint.conversation);
  results.push(gradingGuidanceCheck);

  // Check 10: Tool calls match definitions
  const toolCallsCheck = checkToolCallsMatchDefinitions(dataPoint.conversation);
  results.push(toolCallsCheck);

  // NEW: LLMAJ validators - run independently (don't let one failure stop others)
  // Run all validators concurrently using Promise.allSettled
  const llmajChecks = await Promise.allSettled([
    checkToolCorrectness(dataPoint.conversation, dataPoint.folderName),
    checkConversationFlow(dataPoint.conversation, dataPoint.folderName),
    checkTraceability(dataPoint.conversation, dataPoint.folderName),
    checkGradingGuidanceQuality(dataPoint.conversation, dataPoint.folderName),
    checkAssistantResponse(dataPoint.conversation, dataPoint.folderName),
    checkComponentQuality(dataPoint.conversation, dataPoint.folderName)
  ]);

  // Process results - convert rejections to error results
  llmajChecks.forEach((result, index) => {
    const checkNames = [
      'Tool Correctness',
      'Conversation Flow',
      'Traceability',
      'Grading Guidance Quality',
      'Assistant Response Quality',
      'Component Quality'
    ];

    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      // If a validator threw an error, create a failure result
      console.error(`[LLMAJ] ${checkNames[index]} validator failed:`, result.reason);
      results.push({
        check: checkNames[index],
        passed: false,
        message: `⚠️ Validator encountered an error: ${result.reason?.message || 'Unknown error'}`,
        details: [
          `This validator failed to run completely. The error was: ${result.reason?.message || 'Unknown error'}`,
          `Other validators continued running independently.`
        ]
      });
    }
  });

  const allPassed = results.every(r => r.passed);

  return {
    allPassed,
    results
  };
}

/**
 * Check 1: No "export interface" - should be just "interface"
 */
function checkNoExportInterface(componentsContent: string): ValidationResult {
  const exportInterfaceRegex = /export\s+interface/g;
  const matches = componentsContent.match(exportInterfaceRegex);
  
  if (matches && matches.length > 0) {
    return {
      check: 'No export interface',
      passed: false,
      message: `Found ${matches.length} "export interface" declaration(s). Should use "interface" instead.`,
      details: matches.map((_, idx) => `Occurrence ${idx + 1}`)
    };
  }

  return {
    check: 'No export interface',
    passed: true,
    message: 'No "export interface" found. All interfaces use "interface" only.'
  };
}

/**
 * Check 2: No ReactNode attributes
 */
function checkNoReactNode(parsedComponents: ParsedComponent[]): ValidationResult {
  const reactNodeRegex = /ReactNode|React\.ReactNode/i;
  const violations: string[] = [];

  parsedComponents.forEach(component => {
    component.props.forEach(prop => {
      if (reactNodeRegex.test(prop.type)) {
        violations.push(`${component.name}.${prop.name}: ${prop.type}`);
      }
    });
  });

  if (violations.length > 0) {
    return {
      check: 'No ReactNode attributes',
      passed: false,
      message: `Found ${violations.length} ReactNode attribute(s).`,
      details: violations
    };
  }

  return {
    check: 'No ReactNode attributes',
    passed: true,
    message: 'No ReactNode attributes found.'
  };
}

/**
 * Check 3: All interface attributes match component schema
 */
function checkSchemaMatch(
  conversation: ConversationData | undefined,
  parsedComponents: ParsedComponent[]
): ValidationResult {
  if (!conversation?.componentsSchema?.$defs) {
    return {
      check: 'Interface matches schema',
      passed: true,
      message: 'No component schema found to validate against.'
    };
  }

  if (parsedComponents.length === 0) {
    return {
      check: 'Interface matches schema',
      passed: true,
      message: 'No components parsed to validate.'
    };
  }

  const schemaDefs = conversation.componentsSchema.$defs;
  const mismatches: string[] = [];

  parsedComponents.forEach(component => {
    // Find matching schema definition
    // Try multiple patterns: exact match, with Props suffix, without Props suffix
    const schemaKey = Object.keys(schemaDefs).find(key => {
      const keyWithoutProps = key.replace('Props', '');
      const componentNameLower = component.name.toLowerCase();
      const keyLower = key.toLowerCase();
      const keyWithoutPropsLower = keyWithoutProps.toLowerCase();
      
      return (
        key === component.name ||
        key === `${component.name}Props` ||
        component.name === keyWithoutProps ||
        keyLower === componentNameLower ||
        keyLower === `${componentNameLower}props` ||
        keyWithoutPropsLower === componentNameLower
      );
    });

    if (!schemaKey) {
      mismatches.push(`${component.name}: No matching schema found`);
      return;
    }

    const schema = schemaDefs[schemaKey];
    const schemaProps = schema?.properties?.props?.properties || {};
    const schemaPropNames = new Set(Object.keys(schemaProps));
    const schemaRequired = schema?.properties?.props?.required || [];

    // Get interface prop names
    const interfacePropNames = new Set(component.props.map(p => p.name));

    // Check for props in interface that aren't in schema
    interfacePropNames.forEach(propName => {
      if (!schemaPropNames.has(propName)) {
        // Find the interface prop definition
        const interfaceProp = component.props.find(p => p.name === propName);
        if (!interfaceProp) return;

        // Skip if the prop is optional
        if (interfaceProp.optional) {
          return; // Don't flag optional props
        }

        // Check if the prop type is a list/array
        const isList = /\[\]|Array<|array/i.test(interfaceProp.type);
        if (isList) {
          return; // Don't flag list/array props
        }

        // Check if the prop type is a dictionary/object/record
        const isDict = /Record<|object|Object|Dictionary|Map</i.test(interfaceProp.type);
        if (isDict) {
          return; // Don't flag dictionary/object props
        }

        // Check if the prop is not in required list (making it effectively optional)
        if (!schemaRequired.includes(propName)) {
          return; // Don't flag props that aren't required in schema
        }

        // Only flag if it's a required, non-list, non-dict prop
        mismatches.push(`${component.name}.${propName}: In interface but not in schema`);
      }
    });
  });

  if (mismatches.length > 0) {
    return {
      check: 'Interface matches schema',
      passed: false,
      message: `Found ${mismatches.length} mismatch(es) between interface and schema.`,
      details: mismatches
    };
  }

  return {
    check: 'Interface matches schema',
    passed: true,
    message: 'All interface attributes match component schema.'
  };
}

/**
 * Check 4: All props in conversation match component schema params
 */
function checkPropsMatchSchema(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.componentsSchema?.$defs || !conversation?.conversation) {
    return {
      check: 'Props match schema',
      passed: true,
      message: 'No conversation or schema found to validate against.'
    };
  }

  const schemaDefs = conversation.componentsSchema.$defs;
  const violations: string[] = [];

      conversation.conversation.forEach((message, msgIdx) => {
        if (!Array.isArray(message.content)) return;

        message.content.forEach((item: any) => {
      if (item.type === 'component' && item.component) {
        const componentName = item.component.name;
        const props = item.component.props || {};

        // Find matching schema - try multiple patterns
        const schemaKey = Object.keys(schemaDefs).find(key => {
          const keyWithoutProps = key.replace('Props', '');
          const componentNameLower = componentName.toLowerCase();
          const keyLower = key.toLowerCase();
          const keyWithoutPropsLower = keyWithoutProps.toLowerCase();
          
          return (
            key === componentName ||
            key === `${componentName}Props` ||
            componentName === keyWithoutProps ||
            keyLower === componentNameLower ||
            keyLower === `${componentNameLower}props` ||
            keyWithoutPropsLower === componentNameLower
          );
        });

        if (!schemaKey) {
          violations.push(`Message ${msgIdx + 1}, Component ${componentName}: No schema found`);
          return;
        }

        const schema = schemaDefs[schemaKey];
        const schemaProps = schema?.properties?.props?.properties || {};
        const schemaPropNames = new Set(Object.keys(schemaProps));
        const additionalProperties = schema?.properties?.props?.additionalProperties !== false;

        // Check each prop in the conversation
        Object.keys(props).forEach(propName => {
          if (!schemaPropNames.has(propName) && !additionalProperties) {
            violations.push(
              `Message ${msgIdx + 1}, ${componentName}.${propName}: Not in schema params`
            );
          }
        });
      }
    });
  });

  if (violations.length > 0) {
    return {
      check: 'Props match schema',
      passed: false,
      message: `Found ${violations.length} prop(s) in conversation that don't match schema params.`,
      details: violations
    };
  }

  return {
    check: 'Props match schema',
    passed: true,
    message: 'All props in conversation match component schema params.'
  };
}

/**
 * Check 5: Properties should not appear in custom element before User Prompt allows population
 */
function checkPropsBeforeUserPrompt(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.conversation) {
    return {
      check: 'Props not before User Prompt',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations: string[] = [];
  let firstUserPromptIndex = -1;

  // Find first User Prompt
  conversation.conversation.forEach((message, idx) => {
    if (message.role === 'user' || message.role === 'human') {
      if (firstUserPromptIndex === -1) {
        firstUserPromptIndex = idx;
      }
    }
  });

  if (firstUserPromptIndex === -1) {
    return {
      check: 'Props not before User Prompt',
      passed: true,
      message: 'No User Prompt found in conversation.'
    };
  }

  // Check for components with props before first User Prompt
  conversation.conversation.forEach((message, idx) => {
    if (idx >= firstUserPromptIndex) return; // Only check before UP

    if (Array.isArray(message.content)) {
      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component) {
          const props = item.component.props || {};
          const propKeys = Object.keys(props).filter(k => props[k] !== null && props[k] !== undefined);
          
          if (propKeys.length > 0) {
            violations.push(
              `Message ${idx + 1} (before UP): Component ${item.component.name} has populated props: ${propKeys.join(', ')}`
            );
          }
        }
      });
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Props not before User Prompt',
      passed: false,
      message: `Found ${violations.length} component(s) with populated props before User Prompt.`,
      details: violations
    };
  }

  return {
    check: 'Props not before User Prompt',
    passed: true,
    message: 'No components with populated props found before User Prompt.'
  };
}

/**
 * Check 6: Custom components should not contain interactive elements (e.g., buttons)
 */
function checkNoInteractiveElements(
  _parsedComponents: ParsedComponent[],
  componentsContent: string
): ValidationResult {
  if (!componentsContent) {
    return {
      check: 'No interactive elements',
      passed: true,
      message: 'No components content found to validate.'
    };
  }

  const violations: string[] = [];
  const interactivePatterns = [
    { pattern: /<button/gi, name: 'button' },
    { pattern: /onClick\s*=/gi, name: 'onClick handler' },
    { pattern: /onSubmit\s*=/gi, name: 'onSubmit handler' },
    { pattern: /onChange\s*=/gi, name: 'onChange handler' },
    { pattern: /<input/gi, name: 'input element' },
    { pattern: /<select/gi, name: 'select element' },
    { pattern: /<textarea/gi, name: 'textarea element' },
    { pattern: /cursor:\s*pointer/gi, name: 'pointer cursor (clickable)' },
    { pattern: /role\s*=\s*["']button["']/gi, name: 'button role' },
  ];

  interactivePatterns.forEach(({ pattern, name }) => {
    const matches = componentsContent.match(pattern);
    if (matches && matches.length > 0) {
      violations.push(`Found ${matches.length} ${name}(s)`);
    }
  });

  if (violations.length > 0) {
    return {
      check: 'No interactive elements',
      passed: false,
      message: `Found interactive elements in components.`,
      details: violations
    };
  }

  return {
    check: 'No interactive elements',
    passed: true,
    message: 'No interactive elements found in components.'
  };
}

/**
 * Check 7: No AssistantMessage with both content/components AND tool_calls
 */
function checkAssistantMessageStructure(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.conversation) {
    return {
      check: 'Assistant message structure',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations: string[] = [];

  conversation.conversation.forEach((message, idx) => {
    const isAssistant = message.role === 'assistant';
    const hasToolCalls = message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
    const hasContent = Array.isArray(message.content) && message.content.length > 0;
    const hasComponents = hasContent && 
      message.content.some((item: any) => item.type === 'component' || item.type === 'text');

    // Undesired: AssistantMessage with both content/components AND tool_calls
    if (isAssistant && hasToolCalls && hasContent && hasComponents) {
      violations.push(
        `Message ${idx + 1}: AssistantMessage has both content/components AND tool_calls. Should separate: tool_calls first (content: null), then content/components (tool_calls: null)`
      );
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Assistant message structure',
      passed: false,
      message: `Found ${violations.length} AssistantMessage(s) with both content/components AND tool_calls.`,
      details: violations
    };
  }

  return {
    check: 'Assistant message structure',
    passed: true,
    message: 'AssistantMessages correctly separate tool_calls from content/components.'
  };
}

/**
 * Checks if two numbers match within a tolerance (epsilon)
 * Uses exact matching for integers, tolerance matching for floats
 */
function numbersMatch(num1: number, num2: number, epsilon: number): boolean {
  // For integers, use exact match
  if (Number.isInteger(num1) && Number.isInteger(num2)) {
    return num1 === num2;
  }

  // For floats, use epsilon tolerance to handle precision differences
  return Math.abs(num1 - num2) <= epsilon;
}

/**
 * Determines if a short string should still be checked for matching
 * Returns true for URLs, UUIDs, and structured identifiers
 */
function shouldCheckShortString(str: string): boolean {
  // URLs
  if (str.includes('http') || str.includes('://')) {
    return true;
  }

  // Looks like an ID or UUID (alphanumeric with dashes/underscores, at least 8 chars)
  if (/^[a-zA-Z0-9_-]{8,}$/.test(str)) {
    return true;
  }

  // Contains special structured characters
  if (/[.@:/\\]/.test(str)) {
    return true;
  }

  return false;
}

/**
 * Tokenizes a string into words, filtering out very short tokens
 */
function tokenizeString(str: string, minLength: number = 3): Set<string> {
  // Convert to lowercase and split on non-alphanumeric characters
  const tokens = str
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= minLength);

  return new Set(tokens);
}

/**
 * Calculates the overlap percentage between two sets of tokens
 */
function calculateTokenOverlap(tokens1: Set<string>, tokens2: Set<string>): number {
  if (tokens1.size === 0 || tokens2.size === 0) {
    return 0;
  }

  // Count matching tokens
  let matches = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      matches++;
    }
  }

  // Calculate overlap as: matches / min(size1, size2)
  // This handles the case where one string is longer than the other
  const minSize = Math.min(tokens1.size, tokens2.size);
  return matches / minSize;
}

/**
 * Checks if two strings match using token-based similarity
 */
function tokenBasedMatch(str1: string, str2: string, options: MatchingOptions): boolean {
  const tokens1 = tokenizeString(str1, options.minTokenLength);
  const tokens2 = tokenizeString(str2, options.minTokenLength);

  const overlap = calculateTokenOverlap(tokens1, tokens2);
  return overlap >= options.tokenOverlapThreshold;
}

/**
 * Comprehensive string matching with multiple strategies
 */
function matchStrings(value: string, target: string, options: MatchingOptions): boolean {
  // Both strings must meet minimum length (with exceptions)
  if (value.length < options.minStringLength && !shouldCheckShortString(value)) {
    return false;
  }
  if (target.length < options.minStringLength && !shouldCheckShortString(target)) {
    return false;
  }

  // Strategy 1: Exact match (case-sensitive)
  if (value === target) {
    return true;
  }

  // Strategy 2: Bidirectional substring match
  if (value.includes(target) || target.includes(value)) {
    return true;
  }

  // Strategy 3: Token-based matching (for enhanced/transformed strings)
  if (options.enableTokenMatching) {
    if (tokenBasedMatch(value, target, options)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts all string values from an object or array structure
 */
function extractStrings(obj: any, depth: number = 0): string[] {
  if (depth > 5) return []; // Prevent deep recursion

  const strings: string[] = [];

  if (typeof obj === 'string') {
    strings.push(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      strings.push(...extractStrings(item, depth + 1));
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      strings.push(...extractStrings(value, depth + 1));
    }
  }

  return strings;
}

/**
 * Extracts all numeric values from an object or array structure
 */
function extractNumbers(obj: any, depth: number = 0): number[] {
  if (depth > 5) return []; // Prevent deep recursion

  const numbers: number[] = [];

  if (typeof obj === 'number') {
    numbers.push(obj);
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      numbers.push(...extractNumbers(item, depth + 1));
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      numbers.push(...extractNumbers(value, depth + 1));
    }
  }

  return numbers;
}

/**
 * Checks if a string matches any extracted string from a structure
 */
function structuralExtractionMatch(
  str: string,
  structure: any,
  options: MatchingOptions
): boolean {
  const extractedStrings = extractStrings(structure);

  for (const extracted of extractedStrings) {
    if (typeof extracted === 'string' && extracted.length >= options.minStringLength) {
      // Try bidirectional substring match first
      if (str.includes(extracted) || extracted.includes(str)) {
        return true;
      }

      // Try token-based match if enabled
      if (options.enableTokenMatching) {
        if (tokenBasedMatch(str, extracted, options)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Recursively checks if a value (or any nested part of it) appears in a target object
 */
function valueFoundInTarget(
  value: any,
  target: any,
  depth: number = 0,
  options: MatchingOptions = DEFAULT_MATCHING_OPTIONS
): boolean {
  if (depth > 10) return false; // Prevent infinite recursion

  if (value === null || value === undefined || target === null || target === undefined) {
    return false;
  }

  // Exact match
  if (value === target) {
    return true;
  }

  // Enhanced string matching with multiple strategies
  if (typeof value === 'string' && typeof target === 'string') {
    return matchStrings(value, target, options);
  }

  // String matching against complex structures (extract strings from objects/arrays)
  if (typeof value === 'string' && typeof target === 'object' && options.enableStructuralExtraction) {
    if (structuralExtractionMatch(value, target, options)) {
      return true;
    }
  }

  // For objects, check if value is a subset of target
  if (typeof value === 'object' && typeof target === 'object') {
    // Check if both are arrays of the same length - direct element-wise comparison
    if (Array.isArray(value) && Array.isArray(target) && value.length === target.length) {
      const allMatch = value.every((val, idx) => {
        // Use numeric tolerance for numbers
        if (typeof val === 'number' && typeof target[idx] === 'number') {
          return numbersMatch(val, target[idx], options.numericEpsilon);
        }
        // Recursive check for other types
        return valueFoundInTarget(val, target[idx], depth + 1, options);
      });
      if (allMatch) {
        return true;
      }
    }

    // Check if value is an array of numbers that matches numbers extracted from target structure
    // Example: [0, 0, 1, 6] matches [{count: 0}, {count: 0}, {count: 1}, {count: 6}]
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'number')) {
      const extractedNumbers = extractNumbers(target);
      // Check if value array matches the beginning of extracted numbers
      if (extractedNumbers.length >= value.length) {
        const matches = value.every((val, idx) =>
          typeof extractedNumbers[idx] === 'number' &&
          numbersMatch(val, extractedNumbers[idx], options.numericEpsilon)
        );
        if (matches) {
          return true;
        }
      }
    }

    // Check if value is an array of strings that matches strings extracted from target structure
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')) {
      const extractedStrings = extractStrings(target);
      // Check if value array matches the beginning of extracted strings (or with token matching)
      if (extractedStrings.length >= value.length) {
        const exactMatches = value.every((val, idx) => val === extractedStrings[idx]);
        if (exactMatches) {
          return true;
        }
        // Try token-based matching if exact match fails
        if (options.enableTokenMatching) {
          const tokenMatches = value.every((val, idx) =>
            typeof extractedStrings[idx] === 'string' &&
            matchStrings(val, extractedStrings[idx], options)
          );
          if (tokenMatches) {
            return true;
          }
        }
      }
    }

    // Check if value is an array
    if (Array.isArray(value)) {
      // Check if any element of value array appears in target
      if (value.length > 0) {
        return value.some(item => valueFoundInTarget(item, target, depth + 1, options));
      }
    }

    // Check if value is a subset of target object
    if (!Array.isArray(value) && !Array.isArray(target)) {
      // Check if all keys in value exist in target with matching values
      const valueKeys = Object.keys(value);
      if (valueKeys.length > 0) {
        // Check if at least some keys match (partial match is OK)
        const matchingKeys = valueKeys.filter(key => {
          if (key in target) {
            return valueFoundInTarget(value[key], target[key], depth + 1, options);
          }
          return false;
        });

        // If at least 50% of keys match, consider it traceable
        if (matchingKeys.length > 0 && matchingKeys.length >= Math.min(1, valueKeys.length * 0.5)) {
          return true;
        }
      }
    }

    // Check if value appears anywhere in nested target structure
    if (typeof target === 'object') {
      if (Array.isArray(target)) {
        return target.some(item => valueFoundInTarget(value, item, depth + 1, options));
      } else {
        // Check all values in target object
        return Object.values(target).some(targetValue =>
          valueFoundInTarget(value, targetValue, depth + 1, options)
        );
      }
    }
  }

  // Number matching - with epsilon tolerance for floats
  if (typeof value === 'number' && typeof target === 'number') {
    return numbersMatch(value, target, options.numericEpsilon);
  }

  // Boolean matching
  if (typeof value === 'boolean' && typeof target === 'boolean') {
    return value === target;
  }

  return false;
}

/**
 * Check if a prop value can be traced to any tool result
 */
function canTracePropValue(
  propValue: any,
  toolResults: Map<string, any>,
  options: MatchingOptions = DEFAULT_MATCHING_OPTIONS
): boolean {
  // Skip primitive values that are clearly not from tool results
  if (propValue === null || propValue === undefined) {
    return false;
  }

  // Simple primitives (short strings, numbers, booleans) are usually not from tool results
  if (typeof propValue === 'string' && propValue.length < options.minStringLength) {
    // Unless it matches special patterns (URLs, IDs, etc.)
    if (!shouldCheckShortString(propValue)) {
      return false;
    }
  }

  if (typeof propValue === 'number' || typeof propValue === 'boolean') {
    // Numbers and booleans could come from tool results, but hard to trace
    // Only flag if it's part of a complex structure
    return false;
  }

  // Check all tool results for a match
  for (const [, toolResult] of toolResults.entries()) {
    if (valueFoundInTarget(propValue, toolResult, 0, options)) {
      return true;
    }
  }

  return false;
}

/**
 * Check 8: Component props source clarity - trace where props come from
 * Now includes LLM-based evaluation for potential false positives
 */
async function checkComponentPropsSource(conversation: ConversationData | undefined): Promise<ValidationResult> {
  if (!conversation?.conversation) {
    return {
      check: 'Component props source',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const options: MatchingOptions = DEFAULT_MATCHING_OPTIONS;
  const violations: string[] = [];
  const violationDetails: Array<{ messageIndex: number; componentName: string; propName: string; propValue: any }> = [];
  const toolResults = new Map<string, any>(); // Track tool results by ID

  // First pass: collect tool results
  conversation.conversation.forEach((message) => {
    if (message.role === 'tool' && message.content) {
      const toolCallId: string | undefined = (message as any).tool_call_id || (message as any).toolCallId;
      let content = message.content;

      // Try to parse JSON strings to extract nested values
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      if (toolCallId) {
        toolResults.set(toolCallId, content);
      }
      // Also store without ID for cases where ID might be missing
      if (!toolCallId) {
        toolResults.set(`tool_${message.role}_${conversation.conversation.indexOf(message)}`, content);
      }
    }
  });

  // Second pass: check component props
  conversation.conversation.forEach((message, idx) => {
    if (Array.isArray(message.content)) {
      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component) {
          const props = item.component.props || {};
          const propKeys = Object.keys(props).filter(k => {
            const value = props[k];
            return value !== null && value !== undefined && value !== '';
          });

          propKeys.forEach(propKey => {
            const propValue = props[propKey];

            // Skip if prop value is clearly a simple primitive that's unlikely from tool results
            if (typeof propValue === 'string' && propValue.length < options.minStringLength) {
              // Unless it matches special patterns
              if (!shouldCheckShortString(propValue)) {
                return; // Skip short strings that are likely hardcoded
              }
            }

            // Check if prop value looks like it might come from a tool result
            const looksLikeToolResult =
              typeof propValue === 'object' ||
              (typeof propValue === 'string' && propValue.length > options.minComplexStringLength) ||
              Array.isArray(propValue);

            if (looksLikeToolResult) {
              // Try to trace the prop value to a tool result
              const canTrace = canTracePropValue(propValue, toolResults, options);
              
              // Also check if there are tool results before this message
              const hasToolResultsBefore = Array.from(toolResults.keys()).length > 0;
              
              // Only flag if:
              // 1. It looks like it might come from a tool result
              // 2. We can't trace it to any tool result
              // 3. There are tool results in the conversation (meaning we should be able to trace it)
              // 4. It's not the first message (first message might have hardcoded values)
              if (!canTrace && hasToolResultsBefore && idx > 0) {
                const violationMsg = `Message ${idx + 1}, Component ${item.component.name}.${propKey}: Prop value source unclear (may come from tool result but not traceable)`;
                violations.push(violationMsg);

                // Store detailed info for LLM evaluation
                violationDetails.push({
                  messageIndex: idx,
                  componentName: item.component.name,
                  propName: propKey,
                  propValue
                });
              }
            }
          });
        }
      });
    }
  });

  if (violations.length > 0) {
    // Try LLM evaluation if enabled
    const { loadLlmConfig } = await import('../config/llmConfig');
    const { evaluateViolationsWithLLM } = await import('../services/llmPropsSourceEvaluator');

    const llmConfig = loadLlmConfig();

    if (llmConfig.enabled && llmConfig.apiKey && violationDetails.length > 0) {
      try {
        console.info('[LLM Validation] Starting evaluation of', violationDetails.length, 'violations');

        const llmEval = await evaluateViolationsWithLLM(violationDetails, conversation, llmConfig);

        // All violations approved by LLM?
        if (llmEval.rejectedCount === 0) {
          return {
            check: 'Component props source',
            passed: true, // Override to passed
            message: `Passed with LLM assistance (${llmEval.approvedCount} violations auto-approved)`,
            details: llmEval.details.map(d =>
              `${d.violation}\n  ✓ LLM Auto-approved (${d.category}): ${d.reasoning}`
            ),
            metadata: {
              llmAssisted: true,
              originalViolationCount: violations.length,
              llmApprovedCount: llmEval.approvedCount,
              llmRejectedCount: llmEval.rejectedCount,
              llmDetails: llmEval.details
            }
          };
        } else {
          // Some violations genuine, some approved
          // Include original violations first, then LLM evaluation
          const detailsWithOriginal = [
            '=== ORIGINAL VALIDATION ERRORS ===',
            ...violations.slice(0, 10),
            '',
            '=== LLM EVALUATION ===',
            ...llmEval.details.map(d =>
              d.approved
                ? `${d.violation}\n  ✓ LLM Auto-approved (${d.category}): ${d.reasoning}`
                : `${d.violation}\n  ✗ LLM Rejected (${d.category}): ${d.reasoning}`
            )
          ];

          return {
            check: 'Component props source',
            passed: false,
            message: `Found ${llmEval.rejectedCount} genuine violation(s) (${llmEval.approvedCount} auto-approved by LLM)`,
            details: detailsWithOriginal,
            metadata: {
              llmAssisted: true,
              originalViolationCount: violations.length,
              llmApprovedCount: llmEval.approvedCount,
              llmRejectedCount: llmEval.rejectedCount,
              llmDetails: llmEval.details
            }
          };
        }
      } catch (error: any) {
        // LLM evaluation failed - fall back to original result with warning
        console.error('[LLM Validation] Failed, falling back to original validation:', error.message);
      }
    }

    // Original result (LLM disabled, failed, or not configured)
    return {
      check: 'Component props source',
      passed: false,
      message: `Found ${violations.length} component prop(s) with unclear source.`,
      details: violations.slice(0, 10) // Limit to first 10 to avoid overwhelming
    };
  }

  return {
    check: 'Component props source',
    passed: true,
    message: 'Component props sources are clear and traceable.'
  };
}

/**
 * Check 9: Grading guidance structure
 */
function checkGradingGuidanceStructure(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.conversation) {
    return {
      check: 'Grading guidance structure',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations: string[] = [];
  const warnings: string[] = [];

  conversation.conversation.forEach((message, idx) => {
    const gradingGuidance = message.grading_guidance;
    
    if (!gradingGuidance) {
      // Check if this is a User Prompt - it should have grading guidance
      if (message.role === 'user' || message.role === 'human') {
        warnings.push(`Message ${idx + 1} (User Prompt): No grading_guidance found`);
      }
      return;
    }

    // Check for required fields
    const hasQualityCriteria = gradingGuidance.quality_criteria !== undefined;
    const hasExpectedComponents = gradingGuidance.expected_components !== undefined;

    if (!hasQualityCriteria && !hasExpectedComponents) {
      violations.push(
        `Message ${idx + 1}: grading_guidance missing both quality_criteria and expected_components`
      );
    } else {
      if (!hasQualityCriteria) {
        warnings.push(`Message ${idx + 1}: grading_guidance missing quality_criteria`);
      }
      if (!hasExpectedComponents) {
        warnings.push(`Message ${idx + 1}: grading_guidance missing expected_components`);
      }
    }

    // Check that tool calls are NOT included
    if (gradingGuidance.tool_calls || gradingGuidance.toolCalls) {
      violations.push(
        `Message ${idx + 1}: grading_guidance should NOT include tool_calls (should only have quality_criteria and expected_components)`
      );
    }

    // Check expected_components structure
    if (hasExpectedComponents && Array.isArray(gradingGuidance.expected_components)) {
      gradingGuidance.expected_components.forEach((comp: any, compIdx: number) => {
        if (typeof comp === 'string') {
          // Component name as string is OK
        } else if (typeof comp === 'object' && comp.name) {
          // Component object with name is OK
        } else {
          violations.push(
            `Message ${idx + 1}, expected_components[${compIdx}]: Invalid format (should be string or object with 'name')`
          );
        }
      });
    }
  });

  const allIssues = [...violations, ...warnings];

  if (violations.length > 0) {
    return {
      check: 'Grading guidance structure',
      passed: false,
      message: `Found ${violations.length} grading_guidance violation(s) and ${warnings.length} warning(s).`,
      details: allIssues
    };
  }

  if (warnings.length > 0) {
    return {
      check: 'Grading guidance structure',
      passed: true,
      message: `Grading guidance structure is correct. ${warnings.length} warning(s) found.`,
      details: warnings
    };
  }

  return {
    check: 'Grading guidance structure',
    passed: true,
    message: 'Grading guidance structure is correct: has quality_criteria and expected_components, no tool_calls.'
  };
}

/**
 * Check 10: Tool calls match tool definitions
 * Validates that all tool_use blocks reference defined tools with correct parameters
 */
function checkToolCallsMatchDefinitions(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation) {
    return {
      check: 'Tool calls match definitions',
      passed: true,
      message: 'No conversation data to validate.'
    };
  }

  const toolDefinitions = conversation.tool_definitions;

  // If no tool definitions exist, skip validation (nothing to check against)
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return {
      check: 'Tool calls match definitions',
      passed: true,
      message: 'No tool_definitions found - skipping validation.'
    };
  }

  // Build a map of tool names to definitions for quick lookup
  const toolDefMap = new Map<string, any>();
  toolDefinitions.forEach(def => {
    toolDefMap.set(def.name, def);
  });

  const violations: string[] = [];

  // Check all messages for tool calls
  conversation.conversation.forEach((message, msgIdx) => {
    // Skip non-assistant messages (only assistant can call tools)
    if (message.role !== 'assistant') {
      return;
    }

    // Check for toolCalls field (format: toolCalls array with function objects)
    const toolCalls = (message as any).toolCalls || [];

    // Also check for tool_use blocks in content array (alternative format)
    const toolUseBlocks = Array.isArray(message.content)
      ? message.content.filter((block: any) => block.type === 'tool_use')
      : [];

    // Combine both formats
    const allToolCalls = [
      ...toolCalls.map((tc: any) => ({
        name: tc.function?.name,
        input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      })),
      ...toolUseBlocks.map((tu: any) => ({
        name: tu.name,
        input: tu.input || {}
      }))
    ];

    allToolCalls.forEach((toolCall: any) => {
      const toolName = toolCall.name;
      const toolInput = toolCall.input || {};

      // Check 1: Tool name exists in definitions
      if (!toolDefMap.has(toolName)) {
        violations.push(
          `Message ${msgIdx + 1}: Tool "${toolName}" not found in tool_definitions. Available tools: ${Array.from(toolDefMap.keys()).join(', ')}`
        );
        return;
      }

      const toolDef = toolDefMap.get(toolName);
      const paramDefs = toolDef.parameters || [];

      // Build parameter maps for validation
      const requiredParams = new Set<string>();
      const allParamNames = new Set<string>();
      const paramTypes = new Map<string, string>();

      paramDefs.forEach((param: any) => {
        allParamNames.add(param.name);
        paramTypes.set(param.name, param.type);
        if (param.required) {
          requiredParams.add(param.name);
        }
      });

      // Check 2: All required parameters are provided
      requiredParams.forEach(paramName => {
        if (!(paramName in toolInput)) {
          violations.push(
            `Message ${msgIdx + 1}: Tool "${toolName}" missing required parameter "${paramName}"`
          );
        }
      });

      // Check 3: All provided parameters exist in definition
      Object.keys(toolInput).forEach(inputParam => {
        if (!allParamNames.has(inputParam)) {
          violations.push(
            `Message ${msgIdx + 1}: Tool "${toolName}" has unexpected parameter "${inputParam}". Expected parameters: ${Array.from(allParamNames).join(', ')}`
          );
        }
      });

      // Check 4: Basic type validation (string, number, boolean, array, object)
      Object.keys(toolInput).forEach(inputParam => {
        if (allParamNames.has(inputParam)) {
          const expectedType = paramTypes.get(inputParam);
          const actualValue = toolInput[inputParam];
          const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;

          // Map JS types to schema types
          let expectedJsType = expectedType;
          if (expectedType === 'string' || expectedType === 'number' || expectedType === 'boolean') {
            expectedJsType = expectedType;
          } else if (expectedType === 'array') {
            expectedJsType = 'array';
          } else if (expectedType === 'object') {
            expectedJsType = 'object';
          }

          if (actualType !== expectedJsType && actualValue !== null && actualValue !== undefined) {
            violations.push(
              `Message ${msgIdx + 1}: Tool "${toolName}" parameter "${inputParam}" has type "${actualType}" but expected "${expectedType}"`
            );
          }
        }
      });
    });
  });

  if (violations.length > 0) {
    return {
      check: 'Tool calls match definitions',
      passed: false,
      message: `Found ${violations.length} tool call validation error(s).`,
      details: violations
    };
  }

  // Count total tool uses for success message
  const totalToolUses = conversation.conversation.reduce((count, msg) => {
    const toolCalls = (msg as any).toolCalls || [];
    const toolUseBlocks = Array.isArray(msg.content)
      ? msg.content.filter((block: any) => block.type === 'tool_use')
      : [];
    return count + toolCalls.length + toolUseBlocks.length;
  }, 0);

  if (totalToolUses === 0) {
    return {
      check: 'Tool calls match definitions',
      passed: true,
      message: `Found ${toolDefinitions.length} tool definition(s) but no tool calls in conversation.`
    };
  }

  return {
    check: 'Tool calls match definitions',
    passed: true,
    message: `All ${totalToolUses} tool call(s) match their definitions correctly.`
  };
}

/**
 * NEW: Check 11 - Tool Correctness (LLMAJ Section 2)
 * Verifies tools are properly defined, consistently used, and appropriately applied
 */
async function checkToolCorrectness(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 2: Tool Correctness] Check starting...');

  if (!conversation) {
    console.log('[LLMAJ Section 2: Tool Correctness] No conversation, skipping');
    return {
      check: 'Tool Correctness',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations: any[] = identifyToolCorrectnessViolations(conversation);
  console.log(`[LLMAJ Section 2: Tool Correctness] Found ${violations.length} potential violations`);

  // If no tools and no violations, pass
  const toolDefs = conversation.tool_definitions || [];
  const toolCalls = conversation.conversation.filter(m => (m as any).toolCalls?.length > 0);

  if (toolDefs.length === 0 && toolCalls.length === 0) {
    return {
      check: 'Tool Correctness',
      passed: true,
      message: 'No tools used in conversation.'
    };
  }

  // Step 2: LLM evaluation (async phase with parallel calls)
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateToolCorrectnessWithLLM } = await import('../services/llmToolCorrectnessEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateToolCorrectnessWithLLM(
        violations,
        conversation,
        llmConfig,
        folderName
      );

      // Convert to ValidationResult format - Show ALL items with status
      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      // Format ALL items with status icons and details
      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Tool Correctness',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All tool usage patterns validated (${toolDefs.length} tools, ${toolCalls.length} calls)`
          : `Found ${failedItems.length} tool correctness violation(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM tool correctness evaluation failed:', error.message);
      // Continue with other checks, mark this one with warning
      return {
        check: 'Tool Correctness',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Tool "${v.toolName}": ${v.details}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Tool Correctness',
    passed: violations.length === 0,
    message: violations.length === 0
      ? 'Tool usage patterns appear correct (LLM disabled)'
      : `Found ${violations.length} potential tool issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Tool "${v.toolName}": ${v.details}`)
  };
}

/**
 * Identify tool correctness violations (sync phase)
 */
function identifyToolCorrectnessViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];
  const toolDefs = conversation.tool_definitions || [];
  const toolDefNames = new Set(toolDefs.map(td => td.name));

  // Check 1: All tools used are defined
  conversation.conversation.forEach((msg, idx) => {
    const toolCalls = (msg as any).toolCalls || [];
    toolCalls.forEach((tc: any) => {
      const toolName = tc.function?.name;
      if (toolName && !toolDefNames.has(toolName)) {
        violations.push({
          toolName,
          messageIndices: [idx],
          violationType: 'inconsistent_definition',
          details: `Tool "${toolName}" used but not found in tool_definitions`
        });
      }
    });
  });

  // Check 2: Sequential calls in same message (flag for LLM review)
  // Note: Multiple tool calls in same message are VALID if they can run in parallel
  // Only flag as violation if tools have dependencies
  conversation.conversation.forEach((msg, idx) => {
    const toolCalls = (msg as any).toolCalls || [];
    if (toolCalls.length > 1) {
      // Flag multiple tool calls for LLM to review dependencies
      violations.push({
        toolName: toolCalls.map((tc: any) => tc.function?.name).join(', '),
        messageIndices: [idx],
        violationType: 'sequential_issue',
        details: `${toolCalls.length} tool calls in same message: ${toolCalls.map((tc: any) => tc.function?.name).join(', ')} - LLM should verify they can run in parallel`
      });
    }
  });

  return violations;
}

/**
 * NEW: Check 12 - Conversation Flow (LLMAJ Section 3)
 * Ensures logical message sequences and proper ordering
 */
async function checkConversationFlow(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 3: Conversation Flow] Check starting...');

  if (!conversation?.conversation || conversation.conversation.length === 0) {
    console.log('[LLMAJ Section 3: Conversation Flow] No conversation, skipping');
    return {
      check: 'Conversation Flow',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential flow violations (sync phase)
  const violations: any[] = identifyFlowViolations(conversation);
  console.log(`[LLMAJ Section 3: Conversation Flow] Found ${violations.length} potential violations`);

  // Step 2: LLM evaluation (async phase with parallel calls)
  // Always proceed to LLM for comprehensive validation of all checklist items
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateFlowWithLLM } = await import('../services/llmFlowEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateFlowWithLLM(
        violations,
        conversation,
        llmConfig,
        folderName
      );

      // Convert to ValidationResult format - Show ALL items with status
      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      // Format ALL items with status icons and details
      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Conversation Flow',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All conversation flow patterns validated`
          : `Found ${failedItems.length} flow violation(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM flow evaluation failed:', error.message);
      // Continue with other checks, mark this one with warning
      return {
        check: 'Conversation Flow',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Messages ${v.messageIndices.join(', ')}: ${v.expectedFlow}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Conversation Flow',
    passed: false,
    message: `Found ${violations.length} potential flow issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Messages ${v.messageIndices.join(', ')}: ${v.expectedFlow}`)
  };
}

/**
 * Identify conversation flow violations (sync phase)
 */
function identifyFlowViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];
  const messages = conversation.conversation;

  // Check: Tool messages should be followed by assistant messages
  // BUT: Multiple consecutive tool messages are allowed after an assistant with multiple tool calls
  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];

    // When we find an assistant message with tool calls, track expected tool message count
    if (current.role === 'assistant' && current.toolCalls && current.toolCalls.length > 0) {
      const expectedToolCount = current.toolCalls.length;
      let actualToolCount = 0;
      let j = i + 1;

      // Count consecutive tool messages
      while (j < messages.length && messages[j].role === 'tool') {
        actualToolCount++;
        j++;
      }

      // Check if we have the right number of tool messages
      if (actualToolCount < expectedToolCount) {
        violations.push({
          messageIndices: [i, j - 1],
          violationType: 'missing_assistant_response',
          expectedFlow: `Assistant with ${expectedToolCount} tool calls → ${expectedToolCount} tool messages → Assistant response`,
          actualFlow: `Assistant with ${expectedToolCount} tool calls → only ${actualToolCount} tool messages found`
        });
      }

      // Check if tool messages are followed by assistant (if we have any tool messages)
      if (actualToolCount > 0) {
        const nextAfterTools = messages[j];
        if (nextAfterTools && nextAfterTools.role !== 'assistant') {
          violations.push({
            messageIndices: [i, j],
            violationType: 'missing_assistant_response',
            expectedFlow: `Assistant → ${expectedToolCount} tool messages → Assistant response`,
            actualFlow: `Assistant → ${actualToolCount} tool messages → ${nextAfterTools.role} message (missing assistant response)`
          });
        }
      }

      // Skip past the tool messages we've already checked
      i = j - 1;
    }
  }

  return violations;
}


/**
 * NEW: Check 13 - Traceability (LLMAJ Section 1)
 * Ensures all information traces back to conversation context or tool outputs
 */
async function checkTraceability(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 1: Traceability] Check starting...');

  if (!conversation) {
    console.log('[LLMAJ Section 1: Traceability] No conversation, skipping');
    return {
      check: 'Traceability',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations: any[] = identifyTraceabilityViolations(conversation);
  console.log(`[LLMAJ Section 1: Traceability] Found ${violations.length} potential violations`);

  // Step 2: LLM evaluation (async phase with parallel calls)
  // Always proceed to LLM for comprehensive validation of all checklist items
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateTraceabilityWithLLM } = await import('../services/llmTraceabilityEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateTraceabilityWithLLM(violations, conversation, llmConfig, folderName);

      // Convert to ValidationResult format - Show ALL items with status
      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      // Format ALL items with status icons and details
      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Traceability',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All information is traceable to conversation context`
          : `Found ${failedItems.length} traceability violation(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM traceability evaluation failed:', error.message);
      return {
        check: 'Traceability',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Message ${v.messageIndex}: ${v.content}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Traceability',
    passed: false,
    message: `Found ${violations.length} potential traceability issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Message ${v.messageIndex}: ${v.content}`)
  };
}

/**
 * Identify traceability violations (sync phase)
 */
function identifyTraceabilityViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];

  // Check for common placeholder patterns
  const placeholderPatterns = [
    /example@/i,
    /@example\./i,
    /website\.com/i,
    /yoursite\./i,
    /placeholder/i
  ];

  conversation.conversation.forEach((msg, idx) => {
    if (msg.role === 'assistant') {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      placeholderPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          violations.push({
            messageIndex: idx,
            violationType: 'untraced_claim',
            content: content.substring(0, 200),
            context: { pattern: pattern.source }
          });
        }
      });
    }
  });

  return violations;
}

/**
 * NEW: Check 14 - Grading Guidance Quality (LLMAJ Section 5)
 * Ensures grading guidance is turn-specific and matches actual components
 */
async function checkGradingGuidanceQuality(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 5: Grading Guidance] Check starting...');

  if (!conversation) {
    console.log('[LLMAJ Section 5: Grading Guidance] No conversation, skipping');
    return {
      check: 'Grading Guidance Quality',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations: any[] = identifyGradingGuidanceViolations(conversation);
  console.log(`[LLMAJ Section 5: Grading Guidance] Found ${violations.length} potential violations`);

  // Step 2: LLM evaluation (async phase with parallel calls)
  // Always proceed to LLM for comprehensive validation of all checklist items
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateGradingGuidanceWithLLM } = await import('../services/llmGradingGuidanceEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateGradingGuidanceWithLLM(violations, conversation, llmConfig, folderName);

      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Grading Guidance Quality',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All grading guidance is appropriate and matches components`
          : `Found ${failedItems.length} grading guidance issue(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM grading guidance evaluation failed:', error.message);
      return {
        check: 'Grading Guidance Quality',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Turn ${v.turnIndex}: ${v.details}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Grading Guidance Quality',
    passed: false,
    message: `Found ${violations.length} potential grading guidance issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Turn ${v.turnIndex}: ${v.details}`)
  };
}

/**
 * Identify grading guidance violations (sync phase)
 */
function identifyGradingGuidanceViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];
  let turnIndex = 0;

  conversation.conversation.forEach((msg) => {
    if (msg.role === 'user') {
      const gg = (msg as any).grading_guidance;

      if (gg) {
        // Check for broad language suggesting whole-conversation scope
        const qualityCriteria = JSON.stringify(gg.quality_criteria || {});
        if (/throughout|all|entire|complete|overall/i.test(qualityCriteria)) {
          violations.push({
            turnIndex,
            violationType: 'not_turn_specific',
            details: 'Quality criteria uses broad language suggesting whole-conversation scope'
          });
        }
      }

      turnIndex++;
    }
  });

  return violations;
}

/**
 * NEW: Check 15 - Assistant Response Quality (LLMAJ Section 6)
 * Verifies responses contain no placeholders, false claims, or redundant info
 */
async function checkAssistantResponse(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 6: Assistant Response] Check starting...');

  if (!conversation) {
    console.log('[LLMAJ Section 6: Assistant Response] No conversation, skipping');
    return {
      check: 'Assistant Response Quality',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations: any[] = identifyAssistantResponseViolations(conversation);
  console.log(`[LLMAJ Section 6: Assistant Response] Found ${violations.length} potential violations`);

  // Step 2: LLM evaluation (async phase with parallel calls)
  // Always proceed to LLM for comprehensive validation of all checklist items
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateAssistantResponseWithLLM } = await import('../services/llmAssistantResponseEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateAssistantResponseWithLLM(violations, conversation, llmConfig, folderName);

      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Assistant Response Quality',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All assistant responses are appropriate and complete`
          : `Found ${failedItems.length} assistant response issue(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM assistant response evaluation failed:', error.message);
      return {
        check: 'Assistant Response Quality',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Message ${v.messageIndex}: ${v.details}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Assistant Response Quality',
    passed: false,
    message: `Found ${violations.length} potential assistant response issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Message ${v.messageIndex}: ${v.details}`)
  };
}

/**
 * Identify assistant response violations (sync phase)
 */
function identifyAssistantResponseViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];

  // Check for common issues
  const placeholderPatterns = [
    /example@/i,
    /@example\./i,
    /website\.com/i
  ];

  const actionClaims = [
    /I've sent/i,
    /I've uploaded/i,
    /I've created/i,
    /I've updated/i,
    /I've added/i
  ];

  conversation.conversation.forEach((msg, idx) => {
    if (msg.role === 'assistant') {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);

      // Check for placeholders
      placeholderPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          violations.push({
            messageIndex: idx,
            violationType: 'placeholder',
            details: `Contains placeholder pattern: ${pattern.source}`
          });
        }
      });

      // Check for action claims without tool calls
      const toolCalls = (msg as any).toolCalls || [];
      if (toolCalls.length === 0) {
        actionClaims.forEach(pattern => {
          if (pattern.test(content)) {
            violations.push({
              messageIndex: idx,
              violationType: 'false_claim',
              details: `Claims action but has no tool calls: ${pattern.source}`
            });
          }
        });
      }
    }
  });

  return violations;
}

/**
 * NEW: Check 16 - Component Quality (LLMAJ Section 4)
 * Verifies components are non-interactive, generalizable, grounded, relevant
 */
async function checkComponentQuality(
  conversation: ConversationData | undefined,
  folderName: string
): Promise<ValidationResult> {
  console.log('[LLMAJ Section 4: Component Quality] Check starting...');

  if (!conversation) {
    console.log('[LLMAJ Section 4: Component Quality] No conversation, skipping');
    return {
      check: 'Component Quality',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations: any[] = identifyComponentQualityViolations(conversation);
  console.log(`[LLMAJ Section 4: Component Quality] Found ${violations.length} potential violations`);

  // Step 2: LLM evaluation (async phase with parallel calls)
  // Always proceed to LLM for comprehensive validation of all checklist items
  const { loadLlmConfig } = await import('../config/llmConfig');
  const { evaluateComponentQualityWithLLM } = await import('../services/llmComponentQualityEvaluator');

  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const sectionEval = await evaluateComponentQualityWithLLM(violations, conversation, llmConfig, folderName);

      const failedItems = sectionEval.checkItemResults.filter(r => !r.passed);

      const details = sectionEval.checkItemResults.map(item => {
        if (item.passed) {
          return `✅ ${item.checkDescription}`;
        } else {
          return `❌ ${item.checkDescription} - ${item.failureReason} Context: ${item.context}`;
        }
      });

      return {
        check: 'Component Quality',
        passed: failedItems.length === 0,
        message: failedItems.length === 0
          ? `All components meet quality standards`
          : `Found ${failedItems.length} component quality issue(s)`,
        details,
        metadata: {
          llmAssisted: true,
          originalViolationCount: violations.length,
          llmApprovedCount: sectionEval.checkItemResults.filter(r => r.passed).length,
          llmRejectedCount: failedItems.length,
          llmCallCount: sectionEval.metadata.llmCallCount,
          totalTokens: sectionEval.metadata.totalTokens
        }
      };
    } catch (error: any) {
      console.error('LLM component quality evaluation failed:', error.message);
      return {
        check: 'Component Quality',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map((v: any) => `Component ${v.componentName}: ${v.details}`),
        metadata: {
          llmAssisted: false,
          evaluationFailed: true,
          error: error.message
        }
      };
    }
  }

  return {
    check: 'Component Quality',
    passed: false,
    message: `Found ${violations.length} potential component quality issue(s) (LLM evaluation disabled)`,
    details: violations.map((v: any) => `Component ${v.componentName}: ${v.details}`)
  };
}

/**
 * Identify component quality violations (sync phase)
 */
function identifyComponentQualityViolations(conversation: ConversationData): any[] {
  const violations: any[] = [];

  conversation.conversation.forEach((msg, idx) => {
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      msg.content.forEach((block: any) => {
        if (block.type === 'component' && block.component) {
          const componentName = block.component.name;

          // Check for interactive elements in code
          const code = block.component.code || '';
          const interactivePatterns = [
            /onClick/i,
            /onChange/i,
            /<button/i,
            /<input/i,
            /<textarea/i,
            /<select/i
          ];

          interactivePatterns.forEach(pattern => {
            if (pattern.test(code)) {
              violations.push({
                componentName,
                messageIndex: idx,
                violationType: 'interactive',
                details: `Contains potentially interactive element: ${pattern.source}`
              });
            }
          });
        }
      });
    }
  });

  return violations;
}
