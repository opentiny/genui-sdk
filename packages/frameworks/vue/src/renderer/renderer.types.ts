import type { Component, VNode } from 'vue';
import type { CardSchema, IGenPromptAction } from '@opentiny/genui-sdk-core';

export interface ICustomAction extends Partial<IGenPromptAction> {
  execute: (params: any, context: Record<string, any>) => any;
}

export interface IRendererProps {
  content: string | { [prop: string]: any };
  generating?: boolean;
  isJsonComplete?: boolean;
  customComponents?: Record<string, Component>;
  customActions?: Record<string, ICustomAction>;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, any>;
}

export interface IRendererSlotsProps {
  schema: CardSchema;
  isError: boolean;
  isFinished: boolean;
}

export interface IRendererSlots {
  header?: Component<IRendererSlotsProps> | ((props: IRendererSlotsProps) => VNode | VNode[]);
  footer?: Component<IRendererSlotsProps> | ((props: IRendererSlotsProps) => VNode | VNode[]);
}
