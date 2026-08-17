/*
 * Public API Surface of renderer
 */

export * from './renderer-main';
export * from './renderer-materials';
export * from './parser/material-getter';
export { RENDERER_SETTINGS } from './renderer-settings';
export type { IRendererSettings } from './renderer-settings';
export {
  provideContentChildren,
  provideContentChildrenEnv,
  CONTENT_CHILDREN_TRACK_DIRECTIVES,
  ContentChildrenService,
  ContentChildrenTrackDirective,
  NgSchemaTemplateDirective,
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
  ProjectedTemplateEntry,
} from './content-children';
