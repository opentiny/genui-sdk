import { Pipe, PipeTransform, Type } from '@angular/core';
import { getDirective } from './parser/material-getter';

@Pipe({
  name: 'getDirectives',
  standalone: true,
})
export class GetDirectivesPipe implements PipeTransform {
  transform(directives: { directiveName: string }[] | undefined): Type<any>[] | undefined {
    if (!directives || !directives.length) return undefined;
    return directives
      .map(({ directiveName }) => {
        const directive = getDirective(directiveName);
        if (!directive || !('ɵdir' in directive)) return null;
        return directive;
      })
      .filter((dir) => dir) as Type<any>[];
  }
}
