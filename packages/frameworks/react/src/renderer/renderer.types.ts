import type { IGenPromptAction } from '@opentiny/genui-sdk-core';
import type { GenuiMaterials } from '../config-provider';

export interface ICustomAction extends Partial<IGenPromptAction> {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
}

export interface IRendererProps {
  content: string | Record<string, unknown>;
  generating?: boolean;
  isJsonComplete?: boolean;
  customComponents?: GenuiMaterials;
  customActions?: Record<string, ICustomAction>;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, unknown>;
}
