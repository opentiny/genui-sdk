/**
 * @opentiny/genui-sdk-vue — Vue3 生成式 UI 组件库统一入口。
 * - chat：对话与 Tiny Robot 集成
 * - renderer：Schema 渲染（GenuiRenderer）
 * - config-provider：主题与全局配置
 * 子路径导出见 package.json exports（./chat、./renderer、./config-provider）。
 */
export * from './chat';
export * from './renderer';
export * from './config-provider';
export { RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
