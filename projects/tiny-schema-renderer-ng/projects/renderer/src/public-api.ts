/*
 * Public API Surface of renderer
 */

export * from './renderer-main';
export * from './renderer-materials';
export * from './parser/material-getter';
export { RENDERER_SETTINGS, NOTIFY_CONTEXT_KEY } from './renderer-settings';
export type { IRendererSettings, NotifyOptions, NotifyType, NotifyHandler } from './renderer-settings';
export {
  ContentChildrenService,
  ContentChildrenTrackDirective,
  ContentChildrenTrackTemplateDirective,
  CONTENT_CHILDREN_OUTLET,
  NG_TEMPLATE_SCHEMA_NAME,
  getComponentOutletLabel,
  discoverContentQueryTargets,
  patchContentQuery,
  patchOutletContentQueries,
} from './content-children';
export type {
  OutletSnapshot,
  TreeNode,
  ContentQueryPatchTarget,
  ContentRefEntry,
  OutletContentRefEntry,
  TemplateContentRefEntry,
} from './content-children';
