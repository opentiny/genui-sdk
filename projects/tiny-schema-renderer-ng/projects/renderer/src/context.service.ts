import { Injectable } from '@angular/core';

@Injectable()
export class RendererContextService {
  private context: Record<string, any> = {};
  constructor() {
    this.context = {};
  }

  getContext() {
    return this.context;
  }

  setContext(context: any, clear: boolean = false) {
    clear && Object.keys(this.context).forEach((key) => delete this.context[key]);
    Object.assign(this.context, context);
    this.contextChange();
  }

  contextChange() {
    // 重新赋值获得新地址，触发parseDataPipe刷新
    // console.log('contextChange', this.context);
    // this.context = {...this.context};
  }
}
