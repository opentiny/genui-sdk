/**
 * 产物自检：模板交给 Angular 自己的 parser 过一遍，组件名核对物料声明。
 */
import { DomElementSchemaRegistry, parseTemplate, ParseErrorLevel } from '@angular/compiler';
import type { AngularMaterialsRegistry } from './angular-materials-registry';
import type { ICodegenError } from './types';

const HTML_SCHEMA = new DomElementSchemaRegistry();

// DomElementSchemaRegistry 不识别 SVG；生成的模板里 <svg> 是合法元素,不能报未知组件
const SVG_TAGS = new Set([
  'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'text', 'tspan',
  'defs', 'use', 'symbol', 'marker', 'pattern', 'clipPath', 'mask', 'linearGradient', 'radialGradient',
  'stop', 'filter', 'feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix',
  'feDiffuseLighting', 'feDisplacementMap', 'feDropShadow', 'feFlood', 'feGaussianBlur', 'feImage',
  'feMerge', 'feMorphology', 'feOffset', 'feSpecularLighting', 'feTile', 'feTurbulence', 'animate',
  'animateMotion', 'animateTransform', 'foreignObject', 'image', 'switch', 'view',
]);

export class AngularOutputValidator {
  constructor(private readonly registry: AngularMaterialsRegistry) {}

  validateTemplate(template: string): ICodegenError[] {
    try {
      const { errors } = parseTemplate(template, 'genui-template.html');
      return (errors ?? [])
        .filter((error) => error.level === ParseErrorLevel.ERROR)
        .map((error) => ({ code: 'TEMPLATE_PARSE', message: `模板解析失败：${error.toString()}` }));
    } catch (error) {
      return [{ code: 'TEMPLATE_PARSE', message: `模板解析失败：${toMessage(error)}` }];
    }
  }

  validateDirectiveSet(directiveSet: Iterable<string>): ICodegenError[] {
    const errors: ICodegenError[] = [];
    for (const directiveName of directiveSet) {
      if (this.registry.declaresDirective(directiveName)) {
        continue;
      }
      // 未挂上的指令在模板里只是一个普通属性,Angular 不会像未知组件那样报错,只能在这里兜住
      errors.push({
        code: 'UNKNOWN_DIRECTIVE',
        message: `指令 "${directiveName}" 未在物料配置中声明，模板不会挂载它。`,
      });
    }
    return errors;
  }

  validateComponentSet(componentSet: Iterable<string>): ICodegenError[] {
    const errors: ICodegenError[] = [];
    for (const componentName of componentSet) {
      if (this.registry.declaresComponent(componentName)) {
        continue;
      }
      const tag = this.registry.resolveComponentTag(componentName);
      if (HTML_SCHEMA.hasElement(tag, []) || SVG_TAGS.has(tag)) {
        continue;
      }
      errors.push({
        code: 'UNKNOWN_COMPONENT',
        message: `组件 "${componentName}" 未在物料配置中声明，模板会输出 <${tag}>，Angular 编译将报 NG8001。`,
      });
    }
    return errors;
  }
}

const toMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
