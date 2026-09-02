export { ContentChildrenService, getComponentOutletLabel } from './content-children.service';
export type { OutletSnapshot, TreeNode } from './content-children.service';
export {
  ContentChildrenTrackDirective,
  CONTENT_CHILDREN_OUTLET,
} from './content-children-track.directive';
export { ContentChildrenTrackTemplateDirective } from './content-children-track-template.directive';
export {
  NG_TEMPLATE_SCHEMA_NAME,
  SCHEMA_INDEX_STRIDE,
  discoverContentQueryTargets,
  getContentOutletLocalRef,
  getContentOutletQueryNames,
  getContentOutletSchemaIndex,
  getContentRefs,
  getOutletQueryCandidates,
  patchContentQuery,
  patchOutletContentQueries,
  registerContentRef,
  setContentOutletSchemaIndex,
  unregisterContentRef,
} from './content-children-patch';
export type {
  ContentQueryPatchTarget,
  ContentRefEntry,
  OutletContentRefEntry,
  TemplateContentRefEntry,
} from './content-children-patch';
