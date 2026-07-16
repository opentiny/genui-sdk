import { Pipe, PipeTransform, Type } from '@angular/core';
import { RendererContextService } from './context.service';
import { getDirective } from './parser/material-getter';

@Pipe({
  name: 'getDirectives',
  standalone: true,
  pure: false,
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
