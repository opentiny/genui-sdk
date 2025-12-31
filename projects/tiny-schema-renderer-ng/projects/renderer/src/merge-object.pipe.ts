import { Pipe, PipeTransform } from '@angular/core';
@Pipe({
  name: 'mergeObject',
  standalone: true,
})
export class MergeObjectPipe implements PipeTransform {
  transform( Objects: Record<string, any>[]) {
    return Objects.reduce((acc, object) => {
      return { ...acc, ...object };
    }, {});
  }
}