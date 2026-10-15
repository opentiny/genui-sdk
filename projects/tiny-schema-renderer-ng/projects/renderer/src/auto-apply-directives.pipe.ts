import { Pipe, PipeTransform } from '@angular/core';
import { RendererContextService } from './context.service';
import { getAutoApplyPatterns, getDirective } from './parser/material-getter';

// TODO: support rank for other directives io materials
const CVA_DIRECTIVES = new Set([
  'defaultValueAccessor',
  'checkboxValueAccessor',
  'numberValueAccessor',
  'radioValueAccessor',
  'selectValueAccessor',
  'selectMultipleValueAccessor',
]);

function directiveRank(name: string): number {
  if (CVA_DIRECTIVES.has(name)) {
    return 0;
  }
  if (name === 'ngModel') {
    return 1;
  }
  if (name === 'ngControlStatus') {
    return 2;
  }
  return 3;
}

@Pipe({
  name: 'autoApplyDirectives',
  standalone: true
})
export class AutoApplyDirectivesPipe implements PipeTransform {
  constructor(private readonly contextService: RendererContextService) {}

  transform(directives: {directiveName: string}[] | undefined, schema: any) {
    const context = this.contextService.getContext();
    const patterns = getAutoApplyPatterns(context);
    const appendDirectives = Object.entries(patterns)
      .filter(([key, fn]) => getDirective(key, context) && fn(schema, context)) // TODO  暂无法获取 context 中的 materials，缺少 Symbol
      .reduce((acc, [key]) => {
        if (!directives?.find(d => d.directiveName === key)) {
          acc.push({directiveName: key});
        }
        return acc;
      }, [] as {directiveName: string}[]);
    const merged = [...(directives || []), ...appendDirectives];
    merged.sort((a, b) => directiveRank(a.directiveName) - directiveRank(b.directiveName));
    return merged.length ? merged : undefined;
  }
}
