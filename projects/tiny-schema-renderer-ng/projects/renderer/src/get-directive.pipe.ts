import { inject, Pipe, PipeTransform, Type } from '@angular/core';
import { RendererContextService } from './context.service';

@Pipe({
  name: 'getDirectives',
  standalone: true,
})
export class GetDirectivesPipe implements PipeTransform {
  private readonly contextService = inject(RendererContextService);

  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) return undefined;
    return directives
      .map(({ directiveName }) => {
        const directive = this.contextService.resolveDirective(directiveName);
        if (!directive || !('ɵdir' in directive)) return null;
        return directive;
      })
      .filter((dir) => dir) as Type<any>[];
  }
}
