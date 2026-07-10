import { Injectable } from '@angular/core';
import type { Type } from '@angular/core';
import type { AutoApplyDirectivePattern, IRendererMaterials } from './renderer-materials';
import {
  getAutoApplyPatterns,
  getComponent,
  getDirective,
  getModuleRef,
  hasDirective,
} from './parser/material-getter';

@Injectable()
export class RendererContextService {
  materials: IRendererMaterials = {};
  private readonly dynamicComponents: Record<string, Type<any>> = {};
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

  resolveComponent(name: string): Type<any> | null {
    return getComponent(name, this.materials, this.dynamicComponents);
  }

  resolveModuleRef(name: string): Type<any> | undefined {
    return getModuleRef(name, this.materials);
  }

  resolveDirective(name: string): Type<any> | undefined {
    return getDirective(name, this.materials);
  }

  hasDirective(name: string): boolean {
    return hasDirective(name, this.materials);
  }

  getAutoApplyPatterns(): AutoApplyDirectivePattern {
    return getAutoApplyPatterns(this.materials);
  }
}
