import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AutoGenComponent } from './app/out';

bootstrapApplication(AutoGenComponent, appConfig)
  .catch((err) => console.error(err));
