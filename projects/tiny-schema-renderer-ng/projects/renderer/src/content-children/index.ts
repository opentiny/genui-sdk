import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { ContentChildrenService } from './content-children.service';
import { ContentChildrenTrackDirective } from './content-children-track.directive';
import { NgSchemaTemplateDirective } from './ng-schema-template.directive';

/** Directives to import on `RendererTemplateComponent` (or a host that declares the shared template). */
export const CONTENT_CHILDREN_TRACK_DIRECTIVES = [
  ContentChildrenTrackDirective,
  NgSchemaTemplateDirective,
] as const;

/** Enable outlet-tree registry + ContentChildren QueryList/signal patch bridge. */
export function provideContentChildren(): Provider[] {
  return [ContentChildrenService];
}

export function provideContentChildrenEnv(): EnvironmentProviders {
  return makeEnvironmentProviders(provideContentChildren());
}

export { ContentChildrenService, getComponentOutletLabel } from './content-children.service';
export type { OutletSnapshot, TreeNode } from './content-children.service';
export {
  ContentChildrenTrackDirective,
  CONTENT_CHILDREN_OUTLET,
} from './content-children-track.directive';
export { NgSchemaTemplateDirective } from './ng-schema-template.directive';
export {
  NG_TEMPLATE_SCHEMA_NAME,
  discoverContentQueryTargets,
  getContentOutletLocalRef,
  getContentOutletQueryNames,
  getOutletQueryCandidates,
  getProjectedTemplates,
  patchContentQuery,
  patchOutletContentQueries,
  registerProjectedTemplate,
  setContentOutletLocalRef,
  unregisterProjectedTemplate,
} from './content-children-patch';
export type { ContentQueryPatchTarget, ProjectedTemplateEntry } from './content-children-patch';
