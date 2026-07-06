import type { ComputedRef, InjectionKey } from 'vue';
import type { Component } from 'vue';
import type { ICustomActionItem } from '../chat/chat.types';
import type { IRendererSlots } from '../renderer';

export interface GenuiSchemaCardContext {
  isGeneratingCard: (cardId?: string) => boolean;
  customComponentsMap: ComputedRef<Record<string, Component>>;
  customActionsMap: ComputedRef<Record<string, ICustomActionItem>>;
  requiredCompleteFieldSelectors: ComputedRef<string[]>;
  rendererSlots: ComputedRef<IRendererSlots | undefined>;
}

export const GENUI_SCHEMA_CARD_CONTEXT = Symbol('GENUI_SCHEMA_CARD_CONTEXT') as InjectionKey<GenuiSchemaCardContext>;
