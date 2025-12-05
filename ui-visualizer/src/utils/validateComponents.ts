import { DataPoint, ConversationData } from '../types';
import { ParsedComponent } from './parseComponents';
import { parseComponents } from './parseComponents';

export interface ValidationResult {
  check: string;
  passed: boolean;
  message: string;
  details?: string[];
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

  return validateComponents(dataPoint, parsedComponents, componentsContent);
}

/**
 * Validates component definitions against the specified rules
 */
export function validateComponents(
  dataPoint: DataPoint,
  parsedComponents: ParsedComponent[],
  componentsContent: string
): ValidationReport {
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

  // Check 7: Logical message sequence (tool calls → tool results → components)
  const messageSequenceCheck = checkMessageSequence(dataPoint.conversation);
  results.push(messageSequenceCheck);

  // Check 8: No AssistantMessage with both content/components AND tool_calls
  const assistantMessageStructureCheck = checkAssistantMessageStructure(dataPoint.conversation);
  results.push(assistantMessageStructureCheck);

  // Check 9: Component props source clarity
  const propsSourceCheck = checkComponentPropsSource(dataPoint.conversation);
  results.push(propsSourceCheck);

  // Check 10: Grading guidance structure
  const gradingGuidanceCheck = checkGradingGuidanceStructure(dataPoint.conversation);
  results.push(gradingGuidanceCheck);

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
 * Check 7: Logical message sequence - tool calls → tool results → components
 */
function checkMessageSequence(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.conversation) {
    return {
      check: 'Message sequence',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations: string[] = [];
  let lastToolCallIndex = -1;
  let lastToolResultIndex = -1;

  conversation.conversation.forEach((message, idx) => {
    const hasToolCalls = message.toolCalls && Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
    const isToolMessage = message.role === 'tool';
    const hasComponents = Array.isArray(message.content) && 
      message.content.some((item: any) => item.type === 'component');

    if (hasToolCalls) {
      lastToolCallIndex = idx;
    }

    if (isToolMessage) {
      lastToolResultIndex = idx;
    }

    // Check if components appear before tool results
    if (hasComponents && lastToolCallIndex >= 0 && lastToolResultIndex === -1) {
      violations.push(
        `Message ${idx + 1}: Components appear before tool results (tool calls at message ${lastToolCallIndex + 1})`
      );
    }

    // Check if components appear before tool calls
    if (hasComponents && lastToolCallIndex === -1) {
      // This might be OK if it's the first message, but flag for review
      if (idx > 0) {
        violations.push(
          `Message ${idx + 1}: Components appear but no tool calls found before them`
        );
      }
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Message sequence',
      passed: false,
      message: `Found ${violations.length} sequence violation(s). Tool calls should come before tool results, which should come before components.`,
      details: violations
    };
  }

  return {
    check: 'Message sequence',
    passed: true,
    message: 'Message sequence is logical: tool calls → tool results → components.'
  };
}

/**
 * Check 8: No AssistantMessage with both content/components AND tool_calls
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
 * Check 9: Component props source clarity - trace where props come from
 */
function checkComponentPropsSource(conversation: ConversationData | undefined): ValidationResult {
  if (!conversation?.conversation) {
    return {
      check: 'Component props source',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const options: MatchingOptions = DEFAULT_MATCHING_OPTIONS;
  const violations: string[] = [];
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
                violations.push(
                  `Message ${idx + 1}, Component ${item.component.name}.${propKey}: Prop value source unclear (may come from tool result but not traceable)`
                );
              }
            }
          });
        }
      });
    }
  });

  if (violations.length > 0) {
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
 * Check 10: Grading guidance structure
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

