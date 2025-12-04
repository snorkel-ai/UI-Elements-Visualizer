// Utility to load data from folders
// In a production app, this would be an API endpoint or build-time script

export async function loadDataPoints(): Promise<any[]> {
  // Try to fetch from a generated index file
  // Use relative path to work with GitHub Pages base path
  try {
    const basePath = import.meta.env.BASE_URL || '/';
    // Ensure basePath ends with / and remove double slashes
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    const indexPath = `${normalizedBase}data-index.json`.replace(/\/+/g, '/');
    console.log('Loading data from:', indexPath);
    const response = await fetch(indexPath);
    if (response.ok) {
      const data = await response.json();
      console.log(`Loaded ${data.length} data points`);
      return data;
    } else {
      console.error(`Failed to load data-index.json: ${response.status} ${response.statusText}`);
      console.error('Attempted URL:', indexPath);
    }
  } catch (e) {
    console.error('Error loading data-index.json:', e);
    console.log('Make sure to run: npm run generate-index');
  }
  
  return [];
}

export function extractComponentNames(conversation: any): string[] {
  const componentNames = new Set<string>();
  
  if (!conversation?.conversation) return [];
  
  conversation.conversation.forEach((message: any) => {
    if (message.content && Array.isArray(message.content)) {
      message.content.forEach((item: any) => {
        if (item.type === 'component' && item.component?.name) {
          componentNames.add(item.component.name);
        }
      });
    }
  });
  
  return Array.from(componentNames);
}

export function extractComponentUsage(dataPoints: any[]): Record<string, number> {
  const usage: Record<string, number> = {};
  
  dataPoints.forEach((point) => {
    const components = extractComponentNames(point.conversation);
    components.forEach((name) => {
      usage[name] = (usage[name] || 0) + 1;
    });
  });
  
  return usage;
}
