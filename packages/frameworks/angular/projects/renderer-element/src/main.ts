import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GenuiRenderer, GENUI_MATERIALS } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

const ELEMENT_TAG = 'genui-renderer-ng-element';
createApplication({
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    { provide: GENUI_MATERIALS, useValue: materials },
  ]
}).then((appRef) => {
  const elementCtor = createCustomElement(GenuiRenderer, {
    injector: appRef.injector,
  });
  if (!customElements.get(ELEMENT_TAG)) {
    customElements.define(ELEMENT_TAG, elementCtor);
    console.log(`${ELEMENT_TAG} created`);
  }
});
