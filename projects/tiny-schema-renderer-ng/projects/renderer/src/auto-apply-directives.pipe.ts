import { Pipe, PipeTransform } from '@angular/core';
import { autoApplyDirectivePattern } from './parser/material-getter';

@Pipe({
  name: 'autoApplyDirectives',
  standalone: true,
})
export class AutoApplyDirectivesPipe implements PipeTransform {
  transform(directives: {directiveName: string}[] | undefined, schema: any) {
    const appendDirectives = Object.entries(autoApplyDirectivePattern).filter(([key, fn]) => fn(schema)).reduce((acc,cur)=> {
        if (!directives?.find(d => d.directiveName === cur[0])) {
          acc.push({directiveName: cur[0]});
        }
        return acc;
    }, [] as {directiveName: string}[]);
    const result = [...(directives || []), ...appendDirectives]
    return result.length ? result : undefined;
  }
}