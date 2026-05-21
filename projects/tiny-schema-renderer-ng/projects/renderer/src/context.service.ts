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
  }

}
