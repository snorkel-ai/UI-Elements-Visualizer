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

