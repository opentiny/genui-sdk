import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { GenuiRendererElementHost } from './genui-renderer-element-host';

const ELEMENT_TAG = 'genui-renderer-ng-element';
createApplication({
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    provideNativeDateAdapter(),
  ],
}).then((appRef) => {
  const elementCtor = createCustomElement(GenuiRendererElementHost, {
    injector: appRef.injector,
  });
  if (!customElements.get(ELEMENT_TAG)) {
    customElements.define(ELEMENT_TAG, elementCtor);
    console.log(`${ELEMENT_TAG} created`);
  }
});
