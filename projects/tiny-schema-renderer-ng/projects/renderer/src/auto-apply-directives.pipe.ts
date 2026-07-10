import { inject, Pipe, PipeTransform } from '@angular/core';
import { RendererContextService } from './context.service';

@Pipe({
  name: 'autoApplyDirectives',
  standalone: true,
  pure: false,
})
export class AutoApplyDirectivesPipe implements PipeTransform {
  private readonly contextService = inject(RendererContextService);

  transform(directives: {directiveName: string}[] | undefined, schema: any) {
    const patterns = this.contextService.getAutoApplyPatterns();
    const appendDirectives = Object.entries(patterns)
      .filter(([key, fn]) => this.contextService.hasDirective(key) && fn(schema))
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
