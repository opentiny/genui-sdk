import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

import '@opentiny/ng-themes/styles.css'; // 基础样式
import '@opentiny/ng-themes/theme-default.css'; // 主题样式