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
 * Calculates complexity of a data point based on:
 * - Simple: no nesting, small props API surface (up to 5 props)
 * - Complex: larger props API with nested structures
 *   - Nesting = Composition of components (components containing other components)
 */
export async function calculateComplexity(dataPoint: DataPoint): Promise<ComplexityAnalysis> {
  let parsedComponents: ParsedComponent[] = [];
  
  // Load components.ts if available
  if (dataPoint.componentsPath) {
    try {
      const response = await fetch(dataPoint.componentsPath);
      if (response.ok) {
        const componentsContent = await response.text();
        parsedComponents = parseComponents(componentsContent);
      }
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
    
    // Check for nesting: look for props that are component types
    // This is a heuristic - props that reference other component names suggest nesting
    const componentNames = new Set(parsedComponents.map(c => c.name));
    component.props.forEach(prop => {
      // Check if prop type references another component
      const propType = prop.type.toLowerCase();
      componentNames.forEach(name => {
        if (propType.includes(name.toLowerCase()) && name !== component.name) {
          hasNesting = true;
        }
      });
      
      // Also check for common patterns that indicate nesting
      if (propType.includes('component') || propType.includes('element') || propType.includes('children')) {
        hasNesting = true;
      }
    });
  });
  
  // Also check conversation for nesting patterns
  if (dataPoint.conversation?.conversation) {
    const componentUsage = new Map<string, Set<string>>();
    
    dataPoint.conversation.conversation.forEach(message => {
      if (!Array.isArray(message.content)) return;
      
      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component) {
          const componentName = item.component.name;
          const props = item.component.props || {};
          
          if (!componentUsage.has(componentName)) {
            componentUsage.set(componentName, new Set());
          }
          
          // Check if any prop value looks like a component reference
          Object.values(props).forEach((propValue: any) => {
            if (typeof propValue === 'object' && propValue !== null) {
              // If prop is an object with component-like structure, it might be nesting
              if (propValue.type === 'component' || propValue.component) {
                hasNesting = true;
              }
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
    reason = `Has component nesting (composition)`;
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

