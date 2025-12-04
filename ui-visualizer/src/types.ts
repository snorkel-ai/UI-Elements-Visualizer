export interface ConversationData {
  componentsSchema: {
    $defs: Record<string, any>;
    $ref?: string;
  };
  conversation: Array<{
    role: string;
    content: any;
    grading_guidance?: any;
    toolCalls?: any[];
  }>;
}

export interface ComponentDefinition {
  name: string;
  props: Record<string, any>;
}

export type ComplexityLevel = 'simple' | 'complex';

export interface DataPoint {
  folderName: string;
  folderPath: string;
  conversation?: ConversationData;
  components?: ComponentDefinition[];
  previewImage?: string;
  canvasHtml?: string;
  hasComponents?: boolean;
  componentsPath?: string;
  complexity?: ComplexityLevel;
  complexityReason?: string;
}

export interface ComponentUsage {
  componentName: string;
  count: number;
  examples: Array<{
    folderName: string;
    props: Record<string, any>;
  }>;
}
