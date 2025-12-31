import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RendererMain } from '../../renderer/src/renderer-main';

import '@opentiny/ng-themes/styles.css'; // 基础样式
import '@opentiny/ng-themes/theme-default.css'; // 主题样式

const ELEMENT_TAG = 'tiny-schema-renderer-element-ng';
createApplication({
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
  ]
}).then((appRef) => {
  const elementCtor = createCustomElement(RendererMain, {
    injector: appRef.injector,
  });
  if (!customElements.get(ELEMENT_TAG)) {
    customElements.define(ELEMENT_TAG, elementCtor);
    console.log(`${ELEMENT_TAG} created`);
  }
});
