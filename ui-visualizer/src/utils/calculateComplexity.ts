import { DataPoint } from '../types';
import { ParsedComponent } from './parseComponents';
import { parseComponents } from './parseComponents';

export type ComplexityLevel = 'simple' | 'complex';

export interface ComplexityAnalysis {
  level: ComplexityLevel;
  reason: string;
  propCount: number;
  hasNesting: boolean;
}

/**
 * Recursively checks if a value contains nested objects or arrays
 */
function hasNestedStructure(value: any, depth: number = 0): boolean {
  if (depth > 10) return false; // Prevent infinite recursion
  
  if (value === null || value === undefined) return false;
  
  // Arrays are considered nested if they contain objects
  if (Array.isArray(value)) {
    return value.some(item => 
      typeof item === 'object' && item !== null && hasNestedStructure(item, depth + 1)
    );
  }
  
  // Objects are considered nested if they have nested properties
  if (typeof value === 'object') {
    // Check if object has nested objects/arrays as values
    return Object.values(value).some(val => {
      if (Array.isArray(val)) return true;
      if (typeof val === 'object' && val !== null) {
        return hasNestedStructure(val, depth + 1);
      }
      return false;
    });
  }
  
  return false;
}

/**
 * Checks if a schema property definition indicates nesting
 */
function schemaHasNesting(schemaProp: any): boolean {
  if (!schemaProp || typeof schemaProp !== 'object') return false;
  
  // Array of objects indicates nesting
  if (schemaProp.type === 'array' && schemaProp.items) {
    if (schemaProp.items.type === 'object' || schemaProp.items.additionalProperties) {
      return true;
    }
    // Recursively check nested items
    return schemaHasNesting(schemaProp.items);
  }
  
  // Object with additionalProperties indicates nesting
  if (schemaProp.type === 'object' && schemaProp.additionalProperties) {
    return true;
  }
  
  // Object with nested properties
  if (schemaProp.type === 'object' && schemaProp.properties) {
    return Object.values(schemaProp.properties).some((prop: any) => 
      schemaHasNesting(prop)
    );
  }
  
  // anyOf/oneOf with object types
  if (schemaProp.anyOf || schemaProp.oneOf) {
    const options = schemaProp.anyOf || schemaProp.oneOf;
    return options.some((option: any) => schemaHasNesting(option));
  }
  
  return false;
}

/**
 * Calculates complexity of a data point based on:
 * - Simple: no nesting, small props API surface (up to 5 props)
 * - Complex: larger props API with nested structures
 *   - Nesting = Any nested objects/arrays in props (not just component composition)
 */
export async function calculateComplexity(dataPoint: DataPoint): Promise<ComplexityAnalysis> {
  let parsedComponents: ParsedComponent[] = [];
  
  // Load components.ts if available
  if (dataPoint.componentsPath) {
    try {
      let componentsContent: string;
      if (dataPoint.componentsPath.startsWith('blob:')) {
        const response = await fetch(dataPoint.componentsPath);
        componentsContent = await response.text();
      } else {
        const basePath = import.meta.env.BASE_URL || '/';
        const fullPath = dataPoint.componentsPath.startsWith('/')
          ? `${basePath}${dataPoint.componentsPath.slice(1)}`.replace(/\/+/g, '/')
          : `${basePath}${dataPoint.componentsPath}`.replace(/\/+/g, '/');
        const response = await fetch(fullPath);
        componentsContent = await response.text();
      }
      parsedComponents = parseComponents(componentsContent);
    } catch (e) {
      // Silently fail - will analyze based on conversation only
    }
  }
  
  // Analyze props count and nesting from parsed components
  let maxPropCount = 0;
  let hasNesting = false;
  
  parsedComponents.forEach(component => {
    const propCount = component.props.length;
    maxPropCount = Math.max(maxPropCount, propCount);
    
    // Check the raw definition for nested array patterns (more reliable than parsed types)
    // The regex parser stops at semicolons, so Array<{ id: string; name: string }> gets truncated
    // Look for patterns like: Array<{ ... }> in the raw definition
    const rawDef = component.rawDefinition;
    
    // Match patterns like: propName: Array<{ ... }> or propName?: Array<{ ... }>
    // This catches arrays of objects even when the regex truncated the type
    const arrayOfObjectPattern = /(\w+)\s*\??\s*:\s*Array\s*<\s*\{/gi;
    if (arrayOfObjectPattern.test(rawDef)) {
      hasNesting = true;
    }
    
    // Also check for array syntax with braces: { ... }[]
    const objectArrayPattern = /\{\s*[^}]+\s*\}\s*\[\]/g;
    if (objectArrayPattern.test(rawDef)) {
      hasNesting = true;
    }
    
    // Check prop types for array/object patterns that indicate nesting
    component.props.forEach(prop => {
      const propType = prop.type.toLowerCase();
      
      // Check for array types (arrays of objects indicate nesting)
      if (propType.includes('[]') || propType.includes('array<')) {
        // If it's an array of objects (not primitives), it's nesting
        if (propType.includes('object') || propType.includes('{}') || 
            propType.includes('record') || propType.includes('{')) {
          hasNesting = true;
        }
        // If the parsed type is short and contains Array<, it might be truncated
        // Check the raw definition for the full type
        if (propType.includes('array<') && !propType.includes('{') && propType.length < 30) {
          // Extract the full prop definition from raw definition
          const propNameEscaped = prop.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const propPattern = new RegExp(`${propNameEscaped}\\s*\\??\\s*:\\s*([^;]+)`, 'i');
          const propMatch = component.rawDefinition.match(propPattern);
          if (propMatch && propMatch[1]) {
            const fullType = propMatch[1].trim().toLowerCase();
            // Check if full type is Array<{...}>
            if (fullType.includes('array<{') || fullType.includes('array< {')) {
              hasNesting = true;
            }
          }
        }
      }
      
      // Check for object types with nested structures
      if (propType.includes('object') || propType.includes('record') || 
          (propType.includes('{') && propType.includes('}'))) {
        // Check if it's more than just a simple object type
        if (propType.includes('record<') || (propType.includes('{') && propType.split('{').length > 2)) {
          hasNesting = true;
        }
      }
      
      // Check if prop type references another component (component composition)
      const componentNames = new Set(parsedComponents.map(c => c.name));
      componentNames.forEach(name => {
        if (propType.includes(name.toLowerCase()) && name !== component.name) {
          hasNesting = true;
        }
      });
      
      // Common patterns that indicate nesting
      if (propType.includes('component') || propType.includes('element') || 
          propType.includes('children') || propType.includes('reactnode')) {
        hasNesting = true;
      }
    });
  });
  
  // Check componentsSchema for nested structures
  if (dataPoint.conversation?.componentsSchema?.$defs) {
    Object.values(dataPoint.conversation.componentsSchema.$defs).forEach((def: any) => {
      if (def?.properties?.props?.properties) {
        Object.values(def.properties.props.properties).forEach((propSchema: any) => {
          if (schemaHasNesting(propSchema)) {
            hasNesting = true;
          }
        });
      }
    });
  }
  
  // Check actual prop values in conversation for nested structures
  if (dataPoint.conversation?.conversation) {
    dataPoint.conversation.conversation.forEach(message => {
      if (!Array.isArray(message.content)) return;
      
      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component) {
          const props = item.component.props || {};
          
          // Check each prop value for nested structures
          Object.values(props).forEach((propValue: any) => {
            if (hasNestedStructure(propValue)) {
              hasNesting = true;
            }
          });
        }
      });
    });
  }
  
  // Determine complexity
  const isSimple = maxPropCount <= 5 && !hasNesting;
  const level: ComplexityLevel = isSimple ? 'simple' : 'complex';
  
  let reason = '';
  if (maxPropCount === 0) {
    reason = 'No components found';
  } else if (hasNesting) {
    reason = `Has nested props (objects/arrays in props)`;
  } else if (maxPropCount > 5) {
    reason = `Large props API (${maxPropCount} props)`;
  } else {
    reason = `Small props API (${maxPropCount} props), no nesting`;
  }
  
  return {
    level,
    reason,
    propCount: maxPropCount,
    hasNesting
  };
}


