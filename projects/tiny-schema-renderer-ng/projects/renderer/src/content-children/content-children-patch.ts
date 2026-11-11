export type {
  ContentQueryPatchTarget,
  ContentRefEntry,
  OutletContentRefEntry,
  TemplateContentRefEntry,
} from './content-query-types';
export { NG_TEMPLATE_SCHEMA_NAME, SCHEMA_INDEX_STRIDE } from './content-query-types';
export {
  getContentOutletLocalRef,
  getContentOutletSchemaIndex,
  getContentRefs,
  getTemplateDirectiveInstances,
  registerContentRef,
  setContentOutletSchemaIndex,
  setTemplateDirectiveInstances,
  unregisterContentRef,
} from './content-ref-registry';
export { discoverContentQueryTargets } from './content-query-ivy';
export {
  getContentOutletQueryNames,
  getOutletQueryCandidates,
  resolvePatchResults,
} from './content-query-match';
export { patchContentQuery } from './content-query-signals';
export { patchOutletContentQueries } from './content-query-apply';
