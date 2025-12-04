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

  const violations: string[] = [];
  const toolResults = new Map<string, any>(); // Track tool results by ID

  // First pass: collect tool results
  conversation.conversation.forEach((message) => {
    if (message.role === 'tool' && message.content) {
      const toolCallId: string | undefined = (message as any).tool_call_id || (message as any).toolCallId;
      if (toolCallId) {
        toolResults.set(toolCallId, message.content);
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
            const propValueStr = JSON.stringify(propValue);

            // Check if prop value looks like it might come from a tool result
            // but we can't find a clear source
            const looksLikeToolResult = 
              typeof propValue === 'object' ||
              (typeof propValue === 'string' && propValue.length > 50) ||
              propValueStr.includes('result') ||
              propValueStr.includes('data');

            if (looksLikeToolResult) {
              // Try to find if this value appears in any tool result
              let foundSource = false;
              for (const [, toolResult] of toolResults.entries()) {
                const toolResultStr = JSON.stringify(toolResult);
                if (toolResultStr.includes(propValueStr.substring(0, 20))) {
                  foundSource = true;
                  break;
                }
              }

              if (!foundSource && idx > 0) {
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

