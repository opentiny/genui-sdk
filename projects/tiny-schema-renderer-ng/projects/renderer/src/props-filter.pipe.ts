import { Pipe, PipeTransform, reflectComponentType, Type } from '@angular/core';
import { onEventRegex, toNativeEventName, toOnEventName } from './parser/event-utils';

@Pipe({
  name: 'propsFilter',
  standalone: true,
})
export class PropsFilterPipe implements PipeTransform {
  transform(
    props: Record<string, any>,
    type: 'inputs' | 'outputs' | 'attributes' | 'events',
    component: Type<any> | string | null,
  ): any {
    if (!component) {
      return {};
    }
    if (typeof component === 'string') {
      if (type === 'attributes') {
        return this.objectFilterMapper(props || {}, ([key, _]) => !onEventRegex.test(key));
      }
      if (type === 'events') {
        return this.objectFilterMapper(props || {}, ([key, _]) => onEventRegex.test(key));
      }
      return {};
    }
    const componentType = reflectComponentType(component);
    if (!componentType) {
      return {};
    }
    if (type === 'inputs') {
      return this.objectFilterMapper(
        props || {},
        ([key, _]) =>
          !onEventRegex.test(key) &&
          componentType.inputs.some((input) => input.templateName === key),
      );
    }
    if (type === 'outputs') {
      return this.objectFilterMapper(
        props || {},
        ([key, _]) =>
          onEventRegex.test(key) &&
          componentType.outputs.some((output) => toOnEventName(output.templateName) === key),
        ([key, value]) => [toNativeEventName(key), value],
      );
    }
    if (type === 'attributes') {
      return this.objectFilterMapper(
        props || {},
        ([key, _]) =>
          !onEventRegex.test(key) &&
          !componentType.inputs.some((input) => input.templateName === key),
      );
    }
    if (type === 'events') {
      return this.objectFilterMapper(
        props || {},
        ([key, _]) =>
          onEventRegex.test(key) &&
          !componentType.outputs.some((output) => toOnEventName(output.templateName) === key),
      );
    }
    return {};
  }

  private objectFilterMapper(
    object: Record<string, any>,
    filter: (item: [key: string, value?: any]) => boolean,
    mapper: (item: [key: string, value: any]) => [string, any] = (item) => item,
  ): Record<string, any> {
    return Object.fromEntries(Object.entries(object).filter(filter).map(mapper));
  }
}
