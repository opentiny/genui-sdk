import type { IGenPromptAction } from '@opentiny/genui-sdk-core';
import type { ComponentRegistry } from './component-types';

export interface ICustomAction extends Partial<IGenPromptAction> {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
}

export interface IRendererProps {
  content: string | Record<string, unknown>;
  generating?: boolean;
  isJsonComplete?: boolean;
  customComponents?: ComponentRegistry;
  customActions?: Record<string, ICustomAction>;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, unknown>;
}

export interface GenuiRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}
