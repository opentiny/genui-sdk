import { EnvironmentProviders, makeEnvironmentProviders, Provider } from '@angular/core';
import { ContentChildrenService } from './content-children.service';
import { ContentChildrenTrackDirective } from './content-children-track.directive';

/** Directives to import on `RendererTemplateComponent` (or a host that declares the shared template). */
export const CONTENT_CHILDREN_TRACK_DIRECTIVES = [ContentChildrenTrackDirective] as const;

/** Enable outlet-tree registry. Pair with importing {@link CONTENT_CHILDREN_TRACK_DIRECTIVES}. */
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
