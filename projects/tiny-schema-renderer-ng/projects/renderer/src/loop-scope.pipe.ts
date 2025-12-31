import { Pipe, PipeTransform } from '@angular/core';
import { parseLoopArgs } from './parser/schema-parser';

@Pipe({
  name: 'loopScope',
  standalone: true,
})
export class LoopScopePipe implements PipeTransform {
  transform(data: {
    scope: Record<string, any>;
    index: number;
    item: any;
    loopArgs: string;
  }): Record<string, any> {
    const { scope, index, item, loopArgs } = data;
    return {
      ...scope,
      ...(parseLoopArgs({ index, item, loopArgs }) || {}),
    };
  }
}
