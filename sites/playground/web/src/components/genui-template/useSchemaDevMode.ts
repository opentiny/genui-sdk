import { ref, provide, inject, watch, shallowRef, type InjectionKey, type Ref } from 'vue';
import type { SelectedSchemaNode } from './schema-node-selection';
import type { ComposerContent } from './schema-composer';

export interface SchemaComposerApi {
  insertTag: (node: SelectedSchemaNode) => void;
  getContent: () => ComposerContent;
  clear: () => void;
  focus: () => void;
}

export interface SchemaDevModeContext {
  isDevMode: Ref<boolean>;
  registerComposer: (api: SchemaComposerApi | null) => void;
  insertComposerTag: (node: SelectedSchemaNode) => void;
  getComposerContent: () => ComposerContent | null;
  clearComposer: () => void;
}

const schemaDevModeKey: InjectionKey<SchemaDevModeContext> = Symbol('schemaDevMode');

export function provideSchemaDevMode() {
  const isDevMode = ref(false);
  const composerApi = shallowRef<SchemaComposerApi | null>(null);

  const registerComposer = (api: SchemaComposerApi | null) => {
    composerApi.value = api;
  };

  const insertComposerTag = (node: SelectedSchemaNode) => {
    composerApi.value?.insertTag(node);
  };

  const getComposerContent = () => composerApi.value?.getContent() ?? null;

  const clearComposer = () => {
    composerApi.value?.clear();
  };

  watch(isDevMode, (enabled) => {
    if (!enabled) {
      clearComposer();
    }
  });

  const ctx: SchemaDevModeContext = {
    isDevMode,
    registerComposer,
    insertComposerTag,
    getComposerContent,
    clearComposer,
  };

  provide(schemaDevModeKey, ctx);
  return ctx;
}

export function useSchemaDevMode() {
  const ctx = inject(schemaDevModeKey);
  if (!ctx) {
    throw new Error('useSchemaDevMode must be used within provideSchemaDevMode');
  }
  return ctx;
}

export function useSchemaDevModeOptional() {
  return inject(schemaDevModeKey, null);
}
