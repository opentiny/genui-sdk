import { Injectable } from '@angular/core';
import { MATERIALS_CONTEXT_KEY, type IRendererMaterials } from './renderer-materials';
import { NOTIFY_CONTEXT_KEY, type NotifyHandler } from './renderer-settings';

@Injectable()
export class RendererContextService {
  private context: Record<PropertyKey, any> = {};

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

  setMaterials(materials: IRendererMaterials) {
    this.context[MATERIALS_CONTEXT_KEY] = materials ?? {};
  }

  setNotify(notify?: NotifyHandler) {
    this.context[NOTIFY_CONTEXT_KEY] = notify ? { notify } : {};
  }
}
