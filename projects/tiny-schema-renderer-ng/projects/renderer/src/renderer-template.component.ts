import {
  Component,
  Directive,
  DoCheck,
  Injector,
  Input,
  Pipe,
  PipeTransform,
  TemplateRef,
  Type,
  ViewChild,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RendererContextService } from './context.service';
import { getComponent, getModuleRef } from './parser/material-getter';
import { ProjectNgContentPipe } from './ng-content';
import {
  BlockContentRefsDirective,
  BlockProjectedViewsDirective,
  ProjectedViews,
  RenderNgContentDirective,
} from './block';
import { LoopScopePipe } from './loop-scope.pipe';
import { AttrAndEventDirective } from './attr-and-event.directive';
import { PropsFilterPipe } from './props-filter.pipe';
import { GetDirectivesPipe, GetDirectiveModulesPipe } from './get-directive.pipe';
import { ComponentOutlet } from './component-outlet';
import { ParseDataPipe } from './parse-data.pipe';
import { ApplyDefaultPropsPipe } from './apply-default-props.pipe';
import { MergeObjectPipe } from './merge-object.pipe';
import { AutoApplyDirectivesPipe } from './auto-apply-directives.pipe';
import { RendererDirective } from './renderer.directive';
import { SchemaRefDirective, SchemaRefTemplateDirective } from './schema-ref';
import { SchemaTemplateContextDirective } from './schema-template-context.directive';
import { SchemaTemplateDirectivesDirective } from './schema-template-directives.directive';
import { ContentChildrenTrackDirective, ContentChildrenTrackTemplateDirective } from './content-children';

@Pipe({
  name: 'getModuleRef',
  standalone: true,
})
export class GetModuleRefPipe implements PipeTransform {
  constructor(private readonly contextService: RendererContextService) {}

  transform(componentName: string): Type<any> | undefined {
    return componentName ? getModuleRef(componentName, this.contextService.getContext()) : undefined;
  }
}

@Pipe({
  name: 'getComponent',
  standalone: true,
})
export class GetComponentPipe implements PipeTransform {
  constructor(private readonly contextService: RendererContextService) {}

  transform(componentName: string): Type<any> | null {
    return componentName ? getComponent(componentName, this.contextService.getContext()) : null;
  }
}

@Pipe({
  name: 'isArray',
  standalone: true,
})
export class IsArrayPipe implements PipeTransform {
  transform(value: any): boolean {
    return Array.isArray(value);
  }
}

@Pipe({
  name: 'isString',
  standalone: true,
})
export class IsStringPipe implements PipeTransform {
  transform(value: any): boolean {
    return typeof value === 'string';
  }
}

/**
 * Assigns ngFor track keys when schema children gain new object refs.
 * Runs in DoCheck with a cheap "already keyed?" scan — not a template expression.
 */
@Directive({
  selector: '[schemaTrackChildren]',
  standalone: true,
})
export class SchemaTrackChildrenDirective implements DoCheck {
  @Input('schemaTrackChildren') children: unknown;

  private readonly host = inject(RendererTemplateComponent);

  ngDoCheck(): void {
    this.host.ensureSchemaChildTrackKeysIfNeeded(this.children);
  }
}

@Component({
  selector: 'renderer-template',
  standalone: true,
  imports: [
    CommonModule,
    RendererDirective,
    IsArrayPipe,
    IsStringPipe,
    GetComponentPipe,
    GetModuleRefPipe,
    ProjectNgContentPipe,
    LoopScopePipe,
    AttrAndEventDirective,
    PropsFilterPipe,
    GetDirectivesPipe,
    GetDirectiveModulesPipe,
    ComponentOutlet,
    ContentChildrenTrackDirective,
    ContentChildrenTrackTemplateDirective,
    SchemaRefDirective,
    SchemaRefTemplateDirective,
    SchemaTemplateContextDirective,
    SchemaTemplateDirectivesDirective,
    RenderNgContentDirective,
    BlockContentRefsDirective,
    BlockProjectedViewsDirective,
    SchemaTrackChildrenDirective,
    ParseDataPipe,
    ApplyDefaultPropsPipe,
    MergeObjectPipe,
    AutoApplyDirectivesPipe,
  ],
  templateUrl: './renderer-template.component.html',
  exportAs: 'rendererTemplate',
})
export class RendererTemplateComponent {
  @ViewChild('rendererTemplate', { static: true })
  public template!: TemplateRef<{
    schema: any;
    scope: any;
    parent: any;
    template: TemplateRef<any>;
    viewContainerRef: ViewContainerRef;
    injector: Injector | undefined;
    contentChildrenIndex?: number;
    projectedViews: ProjectedViews | null;
  }>;

  /**
   * Stable ngFor keys (no per-component branches).
   *
   * 1) Same object ref → keep prior key (in-place delta / moves).
   * 2) Else structural fingerprint from componentName + directive names +
   *    primitive props (generic; not matColumnDef-specific). Unique among
   *    siblings → stable across mid-array inserts even when refs are replaced.
   * 3) Duplicate fingerprints (e.g. toggles before `value` streams in) →
   *    disambiguate with index so same-slot replacement still reuses the view.
   */
  private readonly childTrackKeys = new WeakMap<object, string>();
  private childTrackSeq = 0;

  constructor(private contextService: RendererContextService) {}

  get context() {
    return this.contextService.getContext();
  }

  /** Fast path: skip assign unless a child object is missing a key. */
  ensureSchemaChildTrackKeysIfNeeded(children: unknown): void {
    if (!Array.isArray(children) || !children.length) {
      return;
    }
    for (const child of children) {
      if (child && typeof child === 'object' && !this.childTrackKeys.has(child)) {
        this.assignSchemaChildTrackKeys(children);
        return;
      }
    }
  }

  private assignSchemaChildTrackKeys(children: unknown[]): void {
    const used = new Set<string>();
    for (const child of children) {
      if (child && typeof child === 'object') {
        const key = this.childTrackKeys.get(child);
        if (key != null) {
          used.add(key);
        }
      }
    }

    const fingerprints: (string | null)[] = children.map((child) => {
      if (!child || typeof child !== 'object' || this.childTrackKeys.has(child)) {
        return null;
      }
      return fingerprintSchemaChild(child);
    });
    const fpCount = new Map<string, number>();
    for (const fp of fingerprints) {
      if (fp) {
        fpCount.set(fp, (fpCount.get(fp) ?? 0) + 1);
      }
    }

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child || typeof child !== 'object' || this.childTrackKeys.has(child)) {
        continue;
      }
      const node = child as { id?: string };
      if (node.id != null && node.id !== '') {
        const key = String(node.id);
        this.childTrackKeys.set(child, key);
        used.add(key);
        continue;
      }
      const fp = fingerprints[i] ?? `node:${i}`;
      let candidate = (fpCount.get(fp) ?? 0) > 1 ? `${fp}@${i}` : fp;
      if (used.has(candidate)) {
        candidate = `${fp}#${++this.childTrackSeq}`;
      }
      this.childTrackKeys.set(child, candidate);
      used.add(candidate);
    }
  }

  /** Arrow property: NgForOf calls `_trackByFn` without a receiver. */
  trackBySchemaChild = (index: number, child: unknown): string => {
    if (child == null) {
      return `empty:${index}`;
    }
    if (typeof child === 'string') {
      return `text:${index}`;
    }
    if (typeof child !== 'object') {
      return `node:${index}`;
    }
    return this.childTrackKeys.get(child) ?? fingerprintSchemaChild(child);
  };
}

/** componentName + directives + primitive props — identity without component switches. */
function fingerprintSchemaChild(child: object): string {
  const node = child as {
    componentName?: string;
    directives?: { directiveName?: string }[];
    props?: Record<string, unknown>;
  };
  const name = node.componentName ?? 'node';
  const dirs = (node.directives ?? [])
    .map((d) => d.directiveName)
    .filter((d): d is string => !!d)
    .join('+');
  const props = node.props ?? {};
  const propParts: string[] = [];
  for (const key of Object.keys(props).sort()) {
    const value = props[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      propParts.push(`${key}:${value}`);
    }
  }
  return `${name}|${dirs}|${propParts.join(',')}`;
}
