import { bootstrapApplication } from '@angular/platform-browser';
import { Preview } from './preview';

// 单页应用,不引路由:Preview 自己就是根组件,它负责把出码产物挂上去
bootstrapApplication(Preview).catch((err: unknown) => console.error(err));
