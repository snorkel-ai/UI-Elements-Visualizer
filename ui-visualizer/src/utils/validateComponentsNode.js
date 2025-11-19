/**
 * Node.js version of validation utilities
 * Adapted from validateComponents.ts for use in Node.js scripts
 */

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
export function validateComponents(dataPoint, parsedComponents, componentsContent) {
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

