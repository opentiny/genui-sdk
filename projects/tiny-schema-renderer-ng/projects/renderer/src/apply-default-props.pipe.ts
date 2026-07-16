import { inject, Pipe, PipeTransform } from '@angular/core';
import { RENDERER_SETTINGS } from './renderer-settings';
import { applyDefaultPropsToProps } from './apply-default-props';

@Pipe({
  name: 'applyDefaultProps',
  standalone: true,
  pure: false,
})
export class ApplyDefaultPropsPipe implements PipeTransform {
  private readonly rendererSettings = inject(RENDERER_SETTINGS, { optional: true });

  transform(
    props: Record<string, unknown> | null | undefined,
    componentName: string,
  ): Record<string, unknown> {
    const result = { ...(props ?? {}) };
    applyDefaultPropsToProps(componentName, result, this.rendererSettings?.materials?.defaultPropsMap);
    return result;
  }
}
