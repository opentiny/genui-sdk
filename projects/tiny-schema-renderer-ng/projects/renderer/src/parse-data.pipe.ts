import { Pipe, PipeTransform, signal } from "@angular/core";
import { parseData } from "./parser/schema-parser";
import * as _ from 'lodash';
@Pipe({
  name: 'parseData',
  standalone: true,
  pure: false,
})
export class ParseDataPipe implements PipeTransform {
  private previousValue: any = undefined;
  transform(context: Record<string, any>, props: Record<string, any>, scope: Record<string, any>, ...args: any[]): any {
    const value = parseData(props, scope, context);  //TODO: 可以提前对比 props、context、scope是否有更新
    if (!(value === undefined || this.previousValue === undefined)) {
      Object.keys(value).forEach((key) => { // 如果新值与旧值等价，则维持指向稳定性
        if (_.isEqual(this.previousValue[key], value[key])) {
          value[key] = this.previousValue[key];
        }
      });
    }
    this.previousValue = value;
    return value;
  }
}
