import '@opentiny/genui-sdk-materials-angular-angular-material/patch';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

(window as any).__debugProjection = true;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

setTimeout(() => {
  const dump = (label: string, v: unknown) =>
    console.log(label + '|' + JSON.stringify(v ?? [], null, 0)?.replace(/\n/g, '⏎'));
  dump('===PROJ', (window as any).__projLogs);
  dump('===TSS', (window as any).__tssLogs);
  dump('===CSC', (window as any).__cscLogs);
  dump('===SLOT', (window as any).__slotLogs);
  dump('===ERR', (window as any).__genuiErrors);
}, 6000);
