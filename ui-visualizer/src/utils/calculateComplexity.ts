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
 * - Simple: flat component structure (no nested/hierarchical components)
 * - Complex: has nested/hierarchical components (component with "components" key)
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
  
  // Check if any component has nested/hierarchical components (the ONLY complexity check)
  let hasNestedComponents = false;
  let hasComponents = false;

  if (dataPoint.conversation?.conversation) {
    dataPoint.conversation.conversation.forEach(message => {
      if (!Array.isArray(message.content)) return;

      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component) {
          hasComponents = true;

          // Check if component has nested components (hierarchical structure)
          if (item.component.components && Array.isArray(item.component.components) && item.component.components.length > 0) {
            hasNestedComponents = true;
          }
        }
      });
    });
  }

  // Determine complexity - ONLY based on nested components
  const level: ComplexityLevel = hasNestedComponents ? 'complex' : 'simple';

  let reason = '';
  let propCount = 0;

  if (!hasComponents) {
    reason = 'No components found';
  } else if (hasNestedComponents) {
    reason = 'Has nested/hierarchical components';
  } else {
    reason = 'No nested components (flat structure)';
  }

  // Calculate prop count for metadata (not used in complexity decision)
  parsedComponents.forEach(component => {
    propCount = Math.max(propCount, component.props.length);
  });

  return {
    level,
    reason,
    propCount,
    hasNesting: hasNestedComponents
  };
}


