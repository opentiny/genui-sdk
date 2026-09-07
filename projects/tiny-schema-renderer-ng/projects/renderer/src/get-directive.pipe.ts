import { Pipe, PipeTransform, Type } from '@angular/core';
import { RendererContextService } from './context.service';
import { getDirective, getDirectiveModuleRef } from './parser/material-getter';

@Pipe({
  name: 'getDirectives',
  standalone: true,
})
export class GetDirectivesPipe implements PipeTransform {
  constructor(private readonly contextService: RendererContextService) {}

  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) return undefined;
    const context = this.contextService.getContext();
    return directives
      .map(({ directiveName }) => {
        const directive = getDirective(directiveName, context);
        if (!directive || !('ɵdir' in directive)) return null;
        return directive;
      })
      .filter((dir) => dir) as Type<any>[];
  }
}

@Pipe({
  name: 'getDirectiveModules',
  standalone: true,
})
export class GetDirectiveModulesPipe implements PipeTransform {
  constructor(private readonly contextService: RendererContextService) {}

  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) return undefined;
    const context = this.contextService.getContext();
    const modules = directives
      .map(({ directiveName }) => getDirectiveModuleRef(directiveName, context))
      .filter((m): m is Type<any> => !!m);
    return modules.length ? modules : undefined;
  }
}
