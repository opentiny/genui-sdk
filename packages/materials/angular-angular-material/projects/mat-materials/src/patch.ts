import { applyMaterialPatch } from './runtime-patch';

// 副作用入口：import 即应用。推荐在 main.ts 顶部 `import '@opentiny/genui-sdk-materials-angular-angular-material/patch'`。
applyMaterialPatch();
