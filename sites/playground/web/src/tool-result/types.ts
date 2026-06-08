export interface ToolResultSummary {
  type: 'array' | 'object';
  count?: number;
  fields?: string[];
}

export interface ToolResultEntry {
  id: string;
  toolName: string;
  arguments: unknown;
  result: unknown;
  summary?: ToolResultSummary;
}

export interface GetToolResultParams {
  toolName: string;
  id: string;
}
