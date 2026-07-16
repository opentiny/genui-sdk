import { Pipe, PipeTransform } from '@angular/core';
import { RendererContextService } from './context.service';
import { getAutoApplyPatterns, getDirective } from './parser/material-getter';

@Pipe({
  name: 'autoApplyDirectives',
  standalone: true,
  pure: false,
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
    const result = [...(directives || []), ...appendDirectives]
    return result.length ? result : undefined;
  }
}
