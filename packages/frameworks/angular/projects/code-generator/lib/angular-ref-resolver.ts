/**
 * ref 层：schema 的 refName / ref 两个键。模板侧出 `#name` 与 @ViewChild 查询串，类侧出字段声明与赋值——
 * 两半是同一件事的两端（`#token` 查询串 ⇄ `refs.<name>` 契约），必须一起改，所以放在一个文件里。
 */
import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION } from './constants';
import { MEMBER_NAME_RE } from './utils';
import type { IBaseHelpers } from './base-helpers';
import { AngularMaterialsRegistry } from './angular-materials-registry';
import type { IAngularTemplateAttr, ICodegenDescription, ILoopScope, IViewChildRef } from './types';

export class AngularRefResolver {
  constructor(
    private readonly registry: AngularMaterialsRegistry,
    private readonly base: IBaseHelpers,
  ) {}
  handleRefBinding(
    key: 'ref' | 'refName',
    rawValue: unknown,
    componentName: string,
    attrsArr: IAngularTemplateAttr[],
    description: ICodegenDescription,
    loopScope: ILoopScope,
  ): void {
    // "this.refs.myInput" ==> {name: myInput}
    // "this.refs.xxx[loopIndex]" ==> {name: xxx, subscript: loopIndex}
    // "refName" ==> {name: refName}
    const parsed = this.parseRefName(key, rawValue);
    if (!parsed) {
      return;
    }
    const { name, subscript } = parsed;

    if (key === 'ref') {
      // 下标必须是**当前模板作用域里可见**的循环索引变量
      if (subscript && (loopScope.depth === 0 || !loopScope.indexVars.includes(subscript))) {
        return;
      }
      if (!subscript && loopScope.depth > 0) {
        return;
      }
      // @ViewChildren 只给视图顺序,只有「恰在一层循环里 + 下标就是那层的索引 + 中间没有条件渲染」
      // 时查询结果的下标才等于循环下标。
      // 嵌套循环、循环内有 *ngIf：这两种情况 refs.x[i] 都指不到第 i 次迭代,就不生成
      if (subscript && (loopScope.depth !== 1 || loopScope.indexVars[0] !== subscript || loopScope.conditionalInsideLoop)) {
        return;
      }
      if (description.viewChildRefs.some((item) => item.queryName === name)) {
        return;
      }
      const token = `__ref_${name}`;
      const { type, fromPackage, unwrapNative } = this.resolveRefFieldType(componentName);
      description.viewChildRefs.push({
        queryName: name,
        templateToken: token,
        fieldName: name,
        fieldType: type,
        fieldTypePackage: fromPackage,
        assignTo: `refs.${name}`,
        kind: subscript ? 'viewChildren' : 'viewChild',
        unwrapNative,
      });
      attrsArr.push({ left: `#${token}` });
      return;
    }

    // refName 的 name 本身就是要用的模板局部变量,原样输出
    if (attrsArr.some((attr) => attr.left === `#${name}`)) {
      return;
    }
    // 无右值 无值属性形态
    attrsArr.push({ left: `#${name}` });
  }

  
  // 全量扫出会落成模板局部变量的名字:refName 与 ng-template 的 let- 变量。
  collectTemplateLocals(node: unknown, into: Set<string>): void {
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      return;
    }
    const { props, children } = node as NodeSchema;
    if (props && typeof props === 'object') {
      const bag = props as Record<string, unknown>;
      if (typeof bag.refName === 'string' && MEMBER_NAME_RE.test(bag.refName)) {
        into.add(bag.refName);
      }
      if (bag.let && typeof bag.let === 'object') {
        Object.keys(bag.let as Record<string, unknown>).forEach((name) => {
          if (MEMBER_NAME_RE.test(name)) {
            into.add(name);
          }
        });
      }
    }
    if (Array.isArray(children)) {
      children.forEach((child) => this.collectTemplateLocals(child, into));
    }
  }

  parseRefName(
    key: 'ref' | 'refName',
    rawValue: unknown,
  ): { name: string; subscript?: string } | null {
    if (key === 'refName') {
      // 变量名原样进模板(#name)与 refs 契约:非法就丢弃
      return typeof rawValue === 'string' && MEMBER_NAME_RE.test(rawValue) ? { name: rawValue } : null;
    }

    let value: unknown = rawValue;
    if (value && typeof value === 'object') {
      const expr = value as { type?: string; value?: unknown };
      if (expr.type !== JS_EXPRESSION) {
        return null;
      }
      value = expr.value;
    }
    if (typeof value !== 'string') {
      return null;
    }

    // 1) 剥掉 this.refs 前缀
    const trimmed = value.trim();
    let rest: string | null = null;
    if (trimmed.startsWith('this.refs.')) {
      rest = trimmed.slice('this.refs.'.length);
    } else if (trimmed.startsWith('refs.')) {
      rest = trimmed.slice('refs.'.length);
    }
    if (rest === null) {
      return null;
    }

    // 2) 剩下的要么是裸标识符,要么是 `标识符[索引]`
    const bare = /^([A-Za-z_$][\w$]*)$/.exec(rest);
    if (bare) {
      return { name: bare[1] };
    }
    const indexed = /^([A-Za-z_$][\w$]*)\[([A-Za-z_$][\w$]*)\]$/.exec(rest);
    // refs[index] → { name: 'refs', subscript: 'index' }
    return indexed ? { name: indexed[1], subscript: indexed[2] } : null;
  }

  resolveRefFieldType(
    componentName: string | undefined,
  ): { type: string; fromPackage?: string; unwrapNative?: boolean } {
    if (this.registry.isNgTemplateComponent(componentName)) {
      return { type: 'TemplateRef<any>' };
    }
    if (componentName && this.registry.configs.some((c) => this.registry.configDeclaresComponent(c, componentName))) {
      for (const config of this.registry.configs) { // 获取需要导入的组件类
        const className = config.componentExportMap?.[componentName];
        if (className) {
          return { type: className, fromPackage: config.libraryPackage };
        }
      }
      // 声明过物料但推不出组件类名(componentExportMap 未覆盖):仍是实例语义,不能加 nativeElement
      return { type: 'any' };
    }
    // 查询结果是 ElementRef,而 refs 要放 DOM 元素,取值时需再取一层
    return { type: 'ElementRef', unwrapNative: true };
  }

  /**
   * 为每个 @ViewChild 字段定名:默认沿用 queryName,与现有类成员重名时经 avoidDuplicateString 改名。
   * 只改类字段名;`#token` 查询串与 `refs.<name>` 契约保持不变。
   */
  resolveViewChildFieldNames(schema: CardSchema, codegenMeta: ICodegenDescription): void {
    const existing: string[] = ['refs'];
    if (/\bthis\.callAction\b/.test(JSON.stringify(schema))) {
      existing.push('callAction');
    }
    Object.keys((schema.state ?? {}) as Record<string, unknown>).forEach((key) => existing.push(key));
    Object.keys((schema.methods ?? {}) as Record<string, unknown>).forEach((key) => existing.push(key));
    // 模板里自动生成的 __handleN 方法:从方法串首行签名里抠名字,避免与 ref 字段撞名
    codegenMeta.templateGeneratedMethods.forEach((method) => {
      const match = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/.exec(method);
      if (match) {
        existing.push(match[1]);
      }
    });

    // item.fieldName是 @ViewChild 字段名
    codegenMeta.viewChildRefs.forEach((item) => {
      item.fieldName = this.base.avoidDuplicateString(existing, item.queryName);
      existing.push(item.fieldName);
    });
  }

  buildViewChildDecls(codegenMeta: ICodegenDescription): string {
    return codegenMeta.viewChildRefs
      .map((item) => (
        item.kind === 'viewChildren'
          ? `@ViewChildren('${item.templateToken}') ${item.fieldName}!: QueryList<${item.fieldType}>;`
          : `@ViewChild('${item.templateToken}') ${item.fieldName}!: ${item.fieldType};`
      ))
      .join('\n\n  ');
  }
  
  buildRefsField(schema: CardSchema, codegenMeta: ICodegenDescription): string {
    const declared = (schema.refs ?? {}) as Record<string, unknown>;
    if (!Object.keys(declared).length && !codegenMeta.viewChildRefs.length) {
      return '';
    }
    const merged: Record<string, unknown> = { ...declared };
    codegenMeta.viewChildRefs.forEach((item) => {
      // props.ref有但this.refs没有的情况，就在this.refs里添加 aref: null 的键值对，后面再给this.refs.aref赋值
      if (!(item.queryName in merged)) {
        merged[item.queryName] = null;
      }
    });
    return `refs: any = ${JSON.stringify(merged, null, 2)};`;
  }

  buildRefAssignment(item: IViewChildRef): string {
    // 原生元素要.nativeElement
    const value = `this.${item.fieldName}${item.unwrapNative ? '.nativeElement' : ''}`;
    if (item.kind !== 'viewChildren') {
      return `this.${item.assignTo} = ${value};`;
    }
    const listValue = item.unwrapNative ? 'e.nativeElement' : 'e';
    // 局部函数名按字段名派生(fieldName 已是合法标识符且互相去重),多个集合 ref 同处一个钩子也不会撞名
    const sync = `sync${item.fieldName.charAt(0).toUpperCase()}${item.fieldName.slice(1)}`;
    return [
      `const ${sync} = () => {`,
      `  this.${item.assignTo} = this.${item.fieldName}.toArray().map((e) => ${listValue});`,
      `};`,
      `${sync}();`,
      `this.${item.fieldName}.changes.subscribe(${sync});`,
    ].join('\n    ');
  }
}
