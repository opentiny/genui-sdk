import { ref, provide, inject, type InjectionKey, type Ref } from 'vue';

export interface SchemaDevModeContext {
  isDevMode: Ref<boolean>;
}

const schemaDevModeKey: InjectionKey<SchemaDevModeContext> = Symbol('schemaDevMode');

export function provideSchemaDevMode() {
  const isDevMode = ref(false);

  const ctx: SchemaDevModeContext = {
    isDevMode,
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
