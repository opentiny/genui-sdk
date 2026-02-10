import type { Component, VNode } from 'vue';
import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface IRendererProps {
  content: string | { [prop: string]: any };
  generating: boolean;
  customComponents?: Record<string, Component>;
  customActions?: any;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, any>;
  framework?: string;
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
