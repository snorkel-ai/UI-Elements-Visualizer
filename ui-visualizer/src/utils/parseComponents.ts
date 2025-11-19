/**
 * Parses TypeScript component definitions from components.ts file
 * Extracts interface definitions and their properties
 */

export interface ParsedComponent {
  name: string;
  props: Array<{
    name: string;
    type: string;
    description?: string;
    optional?: boolean;
  }>;
  rawDefinition: string;
}

export function parseComponents(componentsContent: string): ParsedComponent[] {
  const components: ParsedComponent[] = [];
  
  // Match interface definitions: interface ComponentNameProps { ... }
  const interfaceRegex = /interface\s+(\w+Props)\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = interfaceRegex.exec(componentsContent)) !== null) {
    const componentName = match[1].replace('Props', '');
    const propsContent = match[2];
    const rawDefinition = match[0];
    
    // Parse properties
    const props: ParsedComponent['props'] = [];
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

