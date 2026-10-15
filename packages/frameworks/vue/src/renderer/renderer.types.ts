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
}

export interface IBaseRendererInstance {
  setContext: (ctx: Record<string | symbol, any>, clear?: boolean) => void;
  getContext: () => Record<string | symbol, any>;
  setState: (state?: Record<string, any>, clear?: boolean) => void;
}

/** `GenuiRenderer` 通过模板 ref 暴露给外部的 API */
export interface IRendererExpose {
  rendererInstance: IBaseRendererInstance | null;
  getState: () => Record<string, any>;
  setState: (state?: Record<string, any>, clear?: boolean) => void;
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
