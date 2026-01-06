import type { Component, VNode } from 'vue';
import type { CardSchema } from '../../core/schema';

export interface IRendererProps {
  content: string | { [prop: string]: any };
  onAction: (message: { llmFriendlyMessage: string; humanFriendlyMessage: string }) => void;
  generating: boolean;
  customComponents?: Record<string, Component>;
  customActions?: any;
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
