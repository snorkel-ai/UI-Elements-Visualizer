/**
 * Node.js version of validation utilities
 * Adapted from validateComponents.ts for use in Node.js scripts
 */

/**
 * Load LLM config from environment variables (Node.js version)
 */
function loadLlmConfig() {
  return {
    enabled: !!process.env.OPENAI_API_KEY,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    temperature: 0.1,
    maxTokens: 2000,
    timeout: 30000
  };
}

/**
 * Parses TypeScript component definitions from components.ts file
 */
export function parseComponents(componentsContent) {
  const components = [];
  
  if (!componentsContent) return components;
  
  // Match interface definitions: interface ComponentNameProps { ... }
  const interfaceRegex = /interface\s+(\w+Props)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = interfaceRegex.exec(componentsContent)) !== null) {
    const componentName = match[1].replace('Props', '');
    const propsContent = match[2];
    const rawDefinition = match[0];
    
    // Parse properties
    const props = [];
    const propRegex = /\/\/\s*(.+?)\n\s*(\w+)(\??):\s*([^;]+);/g;
    let propMatch;
    
    while ((propMatch = propRegex.exec(propsContent)) !== null) {
      props.push({
        name: propMatch[2],
        type: propMatch[4].trim(),
        description: propMatch[1].trim(),
        optional: propMatch[3] === '?'
      });
    }
    
    // Also try simpler pattern without comments
    if (props.length === 0) {
      const simplePropRegex = /(\w+)(\??):\s*([^;]+);/g;
      while ((propMatch = simplePropRegex.exec(propsContent)) !== null) {
        if (!propMatch[1].includes('//') && propMatch[1] !== 'type' && propMatch[1] !== 'interface') {
          props.push({
            name: propMatch[1],
            type: propMatch[3].trim(),
            optional: propMatch[2] === '?'
          });
        }
      }
    }
    
    components.push({
      name: componentName,
      props,
      rawDefinition
    });
  }
  
  return components;
}

/**
 * Validates component definitions against the specified rules
 */
export async function validateComponents(dataPoint, parsedComponents, componentsContent) {
  const results = [];

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

  // Check 5: Props not before User Prompt
  const propsBeforeUserCheck = checkPropsNotBeforeUserPrompt(dataPoint.conversation);
  results.push(propsBeforeUserCheck);

  // Check 6: No interactive elements
  const interactiveElementsCheck = checkNoInteractiveElements(parsedComponents);
  results.push(interactiveElementsCheck);

  // Check 7: Message sequence
  const messageSequenceCheck = checkMessageSequence(dataPoint.conversation);
  results.push(messageSequenceCheck);

  // Check 8: Assistant message structure
  const assistantMessageCheck = checkAssistantMessageStructure(dataPoint.conversation);
  results.push(assistantMessageCheck);

  // Check 9: Component props source
  const propsSourceCheck = checkComponentPropsSource(dataPoint.conversation);
  results.push(propsSourceCheck);

  // Check 10: Grading guidance structure
  const gradingGuidanceCheck = checkGradingGuidanceStructure(dataPoint.conversation);
  results.push(gradingGuidanceCheck);

  // Check 11: Tool calls match definitions
  const toolCallsCheck = checkToolCallsMatchDefinitions(dataPoint.conversation);
  results.push(toolCallsCheck);

  // Check 12: Tool Correctness (LLMAJ Section 2)
  const toolCorrectnessCheck = await checkToolCorrectness(dataPoint.conversation);
  results.push(toolCorrectnessCheck);

  // Check 13: Conversation Flow (LLMAJ Section 3)
  const flowCheck = await checkConversationFlow(dataPoint.conversation);
  results.push(flowCheck);

  const allPassed = results.every(r => r.passed);

  return {
    allPassed,
    results
  };
}

/**
 * Check 1: No "export interface" - should be just "interface"
 */
function checkNoExportInterface(componentsContent) {
  if (!componentsContent) {
    return {
      check: 'No export interface',
      passed: true,
      message: 'No components.ts file found.'
    };
  }
  
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
function checkNoReactNode(parsedComponents) {
  const reactNodeRegex = /ReactNode|React\.ReactNode/i;
  const violations = [];

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
function checkSchemaMatch(conversation, parsedComponents) {
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
  const mismatches = [];

  parsedComponents.forEach(component => {
    // Find matching schema definition
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

    // Track all mismatches (including safe-to-filter ones) for analysis
    const allMismatches = [];
    const safeMismatches = [];
    const unsafeMismatches = [];

    // Check for props in interface that aren't in schema
    interfacePropNames.forEach(propName => {
      if (!schemaPropNames.has(propName)) {
        // Find the interface prop definition
        const interfaceProp = component.props.find(p => p.name === propName);
        if (!interfaceProp) return;

        const mismatchDetail = `${component.name}.${propName}: In interface but not in schema`;
        allMismatches.push({
          component: component.name,
          prop: propName,
          type: interfaceProp.type,
          optional: interfaceProp.optional,
          detail: mismatchDetail
        });

        // Skip if the prop is optional
        if (interfaceProp.optional) {
          safeMismatches.push(mismatchDetail);
          return; // Don't flag optional props
        }

        // Check if the prop type is a list/array
        const isList = /\[\]|Array<|array/i.test(interfaceProp.type);
        if (isList) {
          safeMismatches.push(mismatchDetail);
          return; // Don't flag list/array props
        }

        // Check if the prop type is a dictionary/object/record
        const isDict = /Record<|object|Object|Dictionary|Map</i.test(interfaceProp.type);
        if (isDict) {
          safeMismatches.push(mismatchDetail);
          return; // Don't flag dictionary/object props
        }

        // Check if the prop is not in required list (making it effectively optional)
        if (!schemaRequired.includes(propName)) {
          safeMismatches.push(mismatchDetail);
          return; // Don't flag props that aren't required in schema
        }

        // Only flag if it's a required, non-list, non-dict prop
        unsafeMismatches.push(mismatchDetail);
        mismatches.push(mismatchDetail);
      }
    });
    
    // Store analysis metadata for later review
    if (allMismatches.length > 0) {
      // Attach to the result object if we can
      if (!mismatches.length && safeMismatches.length > 0) {
        // All mismatches were safe-to-filter - store this info
        // We'll add this to a metadata field
      }
    }
  });

  // Track safe-to-filter mismatches separately
  let totalSafeMismatches = 0;
  let totalUnsafeMismatches = mismatches.length;
  
  // We need to recalculate safe mismatches since we filtered them out above
  // This is a bit redundant but ensures we have accurate counts
  parsedComponents.forEach(component => {
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

    if (!schemaKey) return;

    const schema = schemaDefs[schemaKey];
    const schemaProps = schema?.properties?.props?.properties || {};
    const schemaPropNames = new Set(Object.keys(schemaProps));
    const schemaRequired = schema?.properties?.props?.required || [];
    const interfacePropNames = new Set(component.props.map(p => p.name));

    interfacePropNames.forEach(propName => {
      if (!schemaPropNames.has(propName)) {
        const interfaceProp = component.props.find(p => p.name === propName);
        if (!interfaceProp) return;

        const isOptional = interfaceProp.optional;
        const isList = /\[\]|Array<|array/i.test(interfaceProp.type);
        const isDict = /Record<|object|Object|Dictionary|Map</i.test(interfaceProp.type);
        const notRequired = !schemaRequired.includes(propName);

        if (isOptional || isList || isDict || notRequired) {
          totalSafeMismatches++;
        }
      }
    });
  });

  if (mismatches.length > 0) {
    return {
      check: 'Interface matches schema',
      passed: false,
      message: `Found ${mismatches.length} mismatch(es) between interface and schema.`,
      details: mismatches,
      metadata: {
        totalSafeMismatches,
        totalUnsafeMismatches
      }
    };
  }

  return {
    check: 'Interface matches schema',
    passed: true,
    message: totalSafeMismatches > 0 
      ? `All interface attributes match component schema (${totalSafeMismatches} safe-to-filter props not in schema were ignored).`
      : 'All interface attributes match component schema.',
    metadata: {
      totalSafeMismatches,
      totalUnsafeMismatches: 0
    }
  };
}

/**
 * Check 4: All props in conversation match component schema params
 */
function checkPropsMatchSchema(conversation) {
  if (!conversation?.componentsSchema?.$defs || !conversation?.conversation) {
    return {
      check: 'Props match schema',
      passed: true,
      message: 'No conversation or schema found to validate against.'
    };
  }

  const schemaDefs = conversation.componentsSchema.$defs;
  const violations = [];

  conversation.conversation.forEach((message, msgIdx) => {
    if (!Array.isArray(message.content)) return;

    message.content.forEach((item, itemIdx) => {
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
 * Check 5: Props not before User Prompt
 */
function checkPropsNotBeforeUserPrompt(conversation) {
  if (!conversation?.conversation) {
    return {
      check: 'Props not before User Prompt',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations = [];
  let userMessageCount = 0;

  conversation.conversation.forEach((message, idx) => {
    if (message.role === 'user') {
      userMessageCount++;
    }

    if (userMessageCount === 0 && Array.isArray(message.content)) {
      message.content.forEach(item => {
        if (item.type === 'component' && item.component) {
          violations.push(`Message ${idx + 1}: Component "${item.component.name}" before first user message`);
        }
      });
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Props not before User Prompt',
      passed: false,
      message: `Found ${violations.length} component(s) before the first user message.`,
      details: violations
    };
  }

  return {
    check: 'Props not before User Prompt',
    passed: true,
    message: 'No components appear before the first user message.'
  };
}

/**
 * Check 6: No interactive elements
 */
function checkNoInteractiveElements(parsedComponents) {
  const interactiveKeywords = ['onClick', 'onSubmit', 'onChange', 'onFocus', 'onBlur', 'button', 'input', 'form'];
  const violations = [];

  parsedComponents.forEach(component => {
    component.props.forEach(prop => {
      if (interactiveKeywords.some(keyword => prop.name.toLowerCase().includes(keyword.toLowerCase()))) {
        violations.push(`${component.name}.${prop.name}`);
      }
    });
  });

  if (violations.length > 0) {
    return {
      check: 'No interactive elements',
      passed: false,
      message: `Found ${violations.length} potentially interactive prop(s).`,
      details: violations
    };
  }

  return {
    check: 'No interactive elements',
    passed: true,
    message: 'No interactive elements found in component definitions.'
  };
}

/**
 * Check 7: Message sequence
 */
function checkMessageSequence(conversation) {
  if (!conversation?.conversation) {
    return {
      check: 'Message sequence',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations = [];
  let lastRole = null;

  conversation.conversation.forEach((message, idx) => {
    if (lastRole === message.role && message.role !== 'tool') {
      violations.push(`Message ${idx + 1}: Consecutive ${message.role} messages`);
    }
    lastRole = message.role;
  });

  if (violations.length > 0) {
    return {
      check: 'Message sequence',
      passed: false,
      message: `Found ${violations.length} message sequence violation(s).`,
      details: violations
    };
  }

  return {
    check: 'Message sequence',
    passed: true,
    message: 'Message sequence is correct (no consecutive messages from same role).'
  };
}

/**
 * Check 8: Assistant message structure
 */
function checkAssistantMessageStructure(conversation) {
  if (!conversation?.conversation) {
    return {
      check: 'Assistant message structure',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations = [];

  conversation.conversation.forEach((message, idx) => {
    if (message.role === 'assistant') {
      const hasToolCalls = Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
      const hasContent = Array.isArray(message.content) && message.content.length > 0;

      if (hasToolCalls && hasContent) {
        const hasNonText = message.content.some(item => item.type !== 'text');
        if (hasNonText) {
          violations.push(
            `Message ${idx + 1}: Assistant message has both tool_calls and non-text content (components)`
          );
        }
      }
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Assistant message structure',
      passed: false,
      message: `Found ${violations.length} assistant message(s) with incorrect structure.`,
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
 * Configuration options for string matching in props source validation
 */
const DEFAULT_MATCHING_OPTIONS = {
  minStringLength: 10,
  minComplexStringLength: 30,
  minTokenLength: 3,
  tokenOverlapThreshold: 0.4,
  numericEpsilon: 0.01,
  enableTokenMatching: true,
  enableStructuralExtraction: true
};

/**
 * Helper: Check if two numbers match within epsilon tolerance
 */
function numbersMatch(num1, num2, epsilon) {
  if (Number.isInteger(num1) && Number.isInteger(num2)) {
    return num1 === num2;
  }
  return Math.abs(num1 - num2) <= epsilon;
}

/**
 * Helper: Check if a short string should still be checked
 */
function shouldCheckShortString(str) {
  if (str.includes('http') || str.includes('://')) return true;
  if (/^[a-zA-Z0-9_-]{8,}$/.test(str)) return true;
  if (/[.@:/\\]/.test(str)) return true;
  return false;
}

/**
 * Helper: Tokenize string into words
 */
function tokenizeString(str, minLength = 3) {
  const tokens = str
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= minLength);
  return new Set(tokens);
}

/**
 * Helper: Calculate token overlap percentage
 */
function calculateTokenOverlap(tokens1, tokens2) {
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  let matches = 0;
  for (const token of tokens1) {
    if (tokens2.has(token)) matches++;
  }
  const minSize = Math.min(tokens1.size, tokens2.size);
  return matches / minSize;
}

/**
 * Helper: Token-based string matching
 */
function tokenBasedMatch(str1, str2, options) {
  const tokens1 = tokenizeString(str1, options.minTokenLength);
  const tokens2 = tokenizeString(str2, options.minTokenLength);
  const overlap = calculateTokenOverlap(tokens1, tokens2);
  return overlap >= options.tokenOverlapThreshold;
}

/**
 * Helper: Comprehensive string matching
 */
function matchStrings(value, target, options) {
  if (value.length < options.minStringLength && !shouldCheckShortString(value)) return false;
  if (target.length < options.minStringLength && !shouldCheckShortString(target)) return false;
  if (value === target) return true;
  if (value.includes(target) || target.includes(value)) return true;
  if (options.enableTokenMatching && tokenBasedMatch(value, target, options)) return true;
  return false;
}

/**
 * Helper: Extract all strings from nested structure
 */
function extractStrings(obj, depth = 0) {
  if (depth > 5) return [];
  const strings = [];
  if (typeof obj === 'string') {
    strings.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => strings.push(...extractStrings(item, depth + 1)));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.values(obj).forEach(value => strings.push(...extractStrings(value, depth + 1)));
  }
  return strings;
}

/**
 * Helper: Extract all numbers from nested structure
 */
function extractNumbers(obj, depth = 0) {
  if (depth > 5) return [];
  const numbers = [];
  if (typeof obj === 'number') {
    numbers.push(obj);
  } else if (Array.isArray(obj)) {
    obj.forEach(item => numbers.push(...extractNumbers(item, depth + 1)));
  } else if (typeof obj === 'object' && obj !== null) {
    Object.values(obj).forEach(value => numbers.push(...extractNumbers(value, depth + 1)));
  }
  return numbers;
}

/**
 * Helper: Check if string matches extracted strings
 */
function structuralExtractionMatch(str, structure, options) {
  const extractedStrings = extractStrings(structure);
  for (const extracted of extractedStrings) {
    if (typeof extracted === 'string' && extracted.length >= options.minStringLength) {
      if (str.includes(extracted) || extracted.includes(str)) return true;
      if (options.enableTokenMatching && tokenBasedMatch(str, extracted, options)) return true;
    }
  }
  return false;
}

/**
 * Helper: Recursively check if value appears in target
 */
function valueFoundInTarget(value, target, depth = 0, options = DEFAULT_MATCHING_OPTIONS) {
  if (depth > 10) return false;
  if (value === null || value === undefined || target === null || target === undefined) return false;
  if (value === target) return true;

  // String matching
  if (typeof value === 'string' && typeof target === 'string') {
    return matchStrings(value, target, options);
  }

  // String vs structure
  if (typeof value === 'string' && typeof target === 'object' && options.enableStructuralExtraction) {
    if (structuralExtractionMatch(value, target, options)) return true;
  }

  // Object/Array matching
  if (typeof value === 'object' && typeof target === 'object') {
    // Element-wise array comparison
    if (Array.isArray(value) && Array.isArray(target) && value.length === target.length) {
      const allMatch = value.every((val, idx) => {
        if (typeof val === 'number' && typeof target[idx] === 'number') {
          return numbersMatch(val, target[idx], options.numericEpsilon);
        }
        return valueFoundInTarget(val, target[idx], depth + 1, options);
      });
      if (allMatch) return true;
    }

    // Array of numbers vs extracted numbers
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'number')) {
      const extractedNumbers = extractNumbers(target);
      if (extractedNumbers.length >= value.length) {
        const matches = value.every((val, idx) =>
          typeof extractedNumbers[idx] === 'number' &&
          numbersMatch(val, extractedNumbers[idx], options.numericEpsilon)
        );
        if (matches) return true;
      }
    }

    // Array of strings vs extracted strings
    if (Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string')) {
      const extractedStrings = extractStrings(target);
      if (extractedStrings.length >= value.length) {
        const exactMatches = value.every((val, idx) => val === extractedStrings[idx]);
        if (exactMatches) return true;
        if (options.enableTokenMatching) {
          const tokenMatches = value.every((val, idx) =>
            typeof extractedStrings[idx] === 'string' &&
            matchStrings(val, extractedStrings[idx], options)
          );
          if (tokenMatches) return true;
        }
      }
    }

    // Array element matching
    if (Array.isArray(value) && value.length > 0) {
      if (value.some(item => valueFoundInTarget(item, target, depth + 1, options))) return true;
    }

    // Object key matching
    if (!Array.isArray(value) && !Array.isArray(target)) {
      const valueKeys = Object.keys(value);
      if (valueKeys.length > 0) {
        const matchingKeys = valueKeys.filter(key => {
          if (key in target) {
            return valueFoundInTarget(value[key], target[key], depth + 1, options);
          }
          return false;
        });
        if (matchingKeys.length > 0 && matchingKeys.length >= Math.min(1, valueKeys.length * 0.5)) {
          return true;
        }
      }
    }

    // Nested structure search
    if (typeof target === 'object') {
      if (Array.isArray(target)) {
        if (target.some(item => valueFoundInTarget(value, item, depth + 1, options))) return true;
      } else {
        if (Object.values(target).some(targetValue =>
          valueFoundInTarget(value, targetValue, depth + 1, options)
        )) return true;
      }
    }
  }

  // Number matching
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
 * Helper: Check if prop value can be traced to tool results
 */
function canTracePropValue(propValue, toolResults, options = DEFAULT_MATCHING_OPTIONS) {
  if (propValue === null || propValue === undefined) return false;

  if (typeof propValue === 'string' && propValue.length < options.minStringLength) {
    if (!shouldCheckShortString(propValue)) return false;
  }

  if (typeof propValue === 'number' || typeof propValue === 'boolean') return false;

  for (const [, toolResult] of toolResults.entries()) {
    if (valueFoundInTarget(propValue, toolResult, 0, options)) return true;
  }

  return false;
}

/**
 * Check 9: Component props source
 */
function checkComponentPropsSource(conversation) {
  if (!conversation?.conversation) {
    return {
      check: 'Component props source',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const options = DEFAULT_MATCHING_OPTIONS;
  const violations = [];
  const toolResults = new Map();

  // Collect tool results
  conversation.conversation.forEach((message) => {
    if (message.role === 'tool' && message.content) {
      const toolCallId = message.tool_call_id || message.toolCallId;
      let content = message.content;

      // Parse JSON strings
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }

      if (toolCallId) {
        toolResults.set(toolCallId, content);
      } else {
        toolResults.set(`tool_${message.role}_${conversation.conversation.indexOf(message)}`, content);
      }
    }
  });

  // Check component props
  conversation.conversation.forEach((message, idx) => {
    if (Array.isArray(message.content)) {
      message.content.forEach((item) => {
        if (item.type === 'component' && item.component) {
          const componentName = item.component.name;
          const props = item.component.props || {};
          const propKeys = Object.keys(props).filter(k => {
            const value = props[k];
            return value !== null && value !== undefined && value !== '';
          });

          propKeys.forEach(propKey => {
            const propValue = props[propKey];

            if (typeof propValue === 'string' && propValue.length < options.minStringLength) {
              if (!shouldCheckShortString(propValue)) return;
            }

            const looksLikeToolResult =
              typeof propValue === 'object' ||
              (typeof propValue === 'string' && propValue.length > options.minComplexStringLength) ||
              Array.isArray(propValue);

            if (looksLikeToolResult) {
              const canTrace = canTracePropValue(propValue, toolResults, options);
              const hasToolResultsBefore = toolResults.size > 0;

              if (!canTrace && hasToolResultsBefore && idx > 0) {
                violations.push(
                  `Message ${idx + 1}, Component ${componentName}.${propKey}: Prop value source unclear (may come from tool result but not traceable)`
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
      message: `Found ${violations.length} prop(s) with unclear source.`,
      details: violations
    };
  }

  return {
    check: 'Component props source',
    passed: true,
    message: 'All component props can be traced to their sources.'
  };
}

/**
 * Check 10: Grading guidance structure
 */
function checkGradingGuidanceStructure(conversation) {
  if (!conversation?.conversation) {
    return {
      check: 'Grading guidance structure',
      passed: true,
      message: 'No conversation found to validate.'
    };
  }

  const violations = [];

  conversation.conversation.forEach((message, idx) => {
    if (message.role === 'user' && message.grading_guidance) {
      const guidance = message.grading_guidance;

      if (!Array.isArray(guidance.quality_criteria)) {
        violations.push(`Message ${idx + 1}: grading_guidance.quality_criteria must be an array`);
      }

      if (!Array.isArray(guidance.expected_components)) {
        violations.push(`Message ${idx + 1}: grading_guidance.expected_components must be an array`);
      }

      if (message.toolCalls && message.toolCalls.length > 0) {
        violations.push(`Message ${idx + 1}: grading_guidance should not have tool_calls`);
      }
    }
  });

  if (violations.length > 0) {
    return {
      check: 'Grading guidance structure',
      passed: false,
      message: `Found ${violations.length} grading guidance structure violation(s).`,
      details: violations
    };
  }

  return {
    check: 'Grading guidance structure',
    passed: true,
    message: 'Grading guidance structure is correct: has quality_criteria and expected_components, no tool_calls.'
  };
}

/**
 * Check 11: Tool calls match tool definitions
 * Validates that all tool_use blocks reference defined tools with correct parameters
 */
function checkToolCallsMatchDefinitions(conversation) {
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
  const toolDefMap = new Map();
  toolDefinitions.forEach(def => {
    toolDefMap.set(def.name, def);
  });

  const violations = [];

  // Check all messages for tool calls
  conversation.conversation.forEach((message, msgIdx) => {
    // Skip non-assistant messages (only assistant can call tools)
    if (message.role !== 'assistant') {
      return;
    }

    // Check for toolCalls field (format: toolCalls array with function objects)
    const toolCalls = message.toolCalls || [];

    // Also check for tool_use blocks in content array (alternative format)
    const toolUseBlocks = Array.isArray(message.content)
      ? message.content.filter(block => block.type === 'tool_use')
      : [];

    // Combine both formats
    const allToolCalls = [
      ...toolCalls.map(tc => ({
        name: tc.function?.name,
        input: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}
      })),
      ...toolUseBlocks.map(tu => ({
        name: tu.name,
        input: tu.input || {}
      }))
    ];

    allToolCalls.forEach(toolCall => {
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
      const requiredParams = new Set();
      const allParamNames = new Set();
      const paramTypes = new Map();

      paramDefs.forEach(param => {
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
    const toolCalls = msg.toolCalls || [];
    const toolUseBlocks = Array.isArray(msg.content)
      ? msg.content.filter(block => block.type === 'tool_use')
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
 * Check 12: Tool Correctness (LLMAJ Section 2)
 */
async function checkToolCorrectness(conversation) {
  if (!conversation) {
    return {
      check: 'Tool Correctness',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations = identifyToolCorrectnessViolations(conversation);
  const toolDefs = conversation.tool_definitions || [];
  const toolCalls = conversation.conversation.filter(m => m.toolCalls?.length > 0);

  if (toolDefs.length === 0 && toolCalls.length === 0) {
    return {
      check: 'Tool Correctness',
      passed: true,
      message: 'No tools used in conversation.'
    };
  }

  // Step 2: LLM evaluation (async phase with parallel calls)
  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const { evaluateToolCorrectnessWithLLM } = await import('../services/llmToolCorrectnessEvaluator.ts');

      const sectionEval = await evaluateToolCorrectnessWithLLM(violations, conversation, llmConfig);

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
    } catch (error) {
      console.error('LLM tool correctness evaluation failed:', error.message);
      // Continue with other checks, mark this one with warning
      return {
        check: 'Tool Correctness',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map(v => `Tool "${v.toolName}": ${v.details}`),
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
    details: violations.map(v => `Tool "${v.toolName}": ${v.details}`)
  };
}

/**
 * Helper function to identify tool correctness violations
 */
function identifyToolCorrectnessViolations(conversation) {
  const violations = [];
  const toolDefs = conversation.tool_definitions || [];
  const toolDefNames = new Set(toolDefs.map(td => td.name));

  // Check 1: All tools used are defined
  conversation.conversation.forEach((msg, idx) => {
    const toolCalls = msg.toolCalls || [];
    toolCalls.forEach(tc => {
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
    const toolCalls = msg.toolCalls || [];
    if (toolCalls.length > 1) {
      // Flag multiple tool calls for LLM to review dependencies
      violations.push({
        toolName: toolCalls.map(tc => tc.function?.name).join(', '),
        messageIndices: [idx],
        violationType: 'sequential_issue',
        details: `${toolCalls.length} tool calls in same message: ${toolCalls.map(tc => tc.function?.name).join(', ')} - LLM should verify they can run in parallel`
      });
    }
  });

  return violations;
}

/**
 * Check 13: Conversation Flow (LLMAJ Section 3)
 */
async function checkConversationFlow(conversation) {
  if (!conversation) {
    return {
      check: 'Conversation Flow',
      passed: true,
      message: 'No conversation to validate.'
    };
  }

  // Step 1: Identify potential violations (sync phase)
  const violations = identifyFlowViolations(conversation);

  if (violations.length === 0) {
    return {
      check: 'Conversation Flow',
      passed: true,
      message: 'Conversation flow follows expected patterns.'
    };
  }

  // Step 2: LLM evaluation (async phase with parallel calls)
  const llmConfig = loadLlmConfig();

  if (llmConfig.enabled && llmConfig.apiKey) {
    try {
      const { evaluateFlowWithLLM } = await import('../services/llmFlowEvaluator.ts');

      const sectionEval = await evaluateFlowWithLLM(violations, conversation, llmConfig);

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
    } catch (error) {
      console.error('LLM flow evaluation failed:', error.message);
      // Continue with other checks, mark this one with warning
      return {
        check: 'Conversation Flow',
        passed: false,
        message: `⚠️ LLM evaluation failed: ${error.message}. Found ${violations.length} potential issues (not validated)`,
        details: violations.map(v => `Messages ${v.messageIndices.join(', ')}: ${v.expectedFlow} → ${v.actualFlow}`),
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
    details: violations.map(v => `Messages ${v.messageIndices.join(', ')}: ${v.expectedFlow} → ${v.actualFlow}`)
  };
}

/**
 * Helper function to identify flow violations
 */
function identifyFlowViolations(conversation) {
  const violations = [];
  const messages = conversation.conversation;

  // Check: Tool messages should be followed by assistant messages
  // BUT: Multiple consecutive tool messages are allowed after an assistant with multiple tool calls
  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];

    // When we find an assistant message with tool calls, track expected tool message count
    if (current.role === 'assistant' && current.tool_calls && current.tool_calls.length > 0) {
      const expectedToolCount = current.tool_calls.length;
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

