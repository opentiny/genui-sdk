import { Pipe, PipeTransform, Type } from '@angular/core';
import { RendererContextService } from './context.service';
import { getDirective, getDirectiveModuleRef } from './parser/material-getter';

function sameTypeList(a: Type<any>[] | undefined, b: Type<any>[] | undefined): boolean {
  if (a === b) {
    return true;
  }
  if (!a?.length && !b?.length) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

@Pipe({
  name: 'getDirectives',
  standalone: true,
})
export class GetDirectivesPipe implements PipeTransform {
  private previousResult: Type<any>[] | undefined;

  constructor(private readonly contextService: RendererContextService) {}

  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) {
      this.previousResult = undefined;
      return undefined;
    }
    const context = this.contextService.getContext();
    const next = directives
      .map(({ directiveName }) => {
        const directive = getDirective(directiveName, context);
        if (!directive || !('ɵdir' in directive)) return null;
        return directive;
      })
      .filter((dir) => dir) as Type<any>[];
    // Same types → reuse prior array so ComponentOutlet does not remount on identity churn.
    if (sameTypeList(this.previousResult, next)) {
      return this.previousResult;
    }
    this.previousResult = next;
    return next;
  }
}

@Pipe({
  name: 'getDirectiveModules',
  standalone: true,
})
export class GetDirectiveModulesPipe implements PipeTransform {
  private previousResult: Type<any>[] | undefined;

  constructor(private readonly contextService: RendererContextService) {}

  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) {
      this.previousResult = undefined;
      return undefined;
    }
    const context = this.contextService.getContext();
    const next = directives
      .map(({ directiveName }) => getDirectiveModuleRef(directiveName, context))
      .filter((m): m is Type<any> => !!m);
    const result = next.length ? next : undefined;
    if (sameTypeList(this.previousResult, result)) {
      return this.previousResult;
    }
    this.previousResult = result;
    return result;
  }
}
