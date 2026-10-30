import { defineCustomElement, type ComponentPublicInstance } from 'vue';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import GenuiConfigRendererCe from './GenuiConfigRenderer.ce.vue';
import { GENUI_BAKED_MATERIALS } from './materials-token';

// SFC 导入的类型需要收敛成构造函数才能命中 defineCustomElement 的重载
type CustomElementRoot = new (...args: unknown[]) => ComponentPublicInstance;

export function createGenuiConfigRendererElement(materials: IMaterials = {}): ReturnType<typeof defineCustomElement> {
  return defineCustomElement(GenuiConfigRendererCe as unknown as CustomElementRoot, {
    shadowRoot: false,
    configureApp(app) {
      app.provide(GENUI_BAKED_MATERIALS, materials);
    },
  });
}
