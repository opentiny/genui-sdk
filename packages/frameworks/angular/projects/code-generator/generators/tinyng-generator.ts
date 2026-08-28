import type { NodeSchema, CardSchema } from '@opentiny/genui-sdk-core';
import { JS_EXPRESSION } from '../constants';
import type { ICodeGeneratorParams, ICodegenDescription, IAngularLibraryConfig, ICodeGeneratorResult } from '../types';
import { AngularCodeGeneratorBase } from '../angular-code-generator-base';
import { componentSelector, moduleRefMap, componentExtraSelector, libraryComponents } from './tinyng-map';

const TINYNG_CONFIG: IAngularLibraryConfig = {
  componentSelector,
  moduleRefMap,
  libraryPackage: '@opentiny/ng',
  componentExtraSelector,
  extraVoidElements: ['ti-image'],
  propBlacklist: { TiTable: ['border', 'stripe'] },
  propRename: { TiPagination: { total: 'totalNumber' } },
};

export class TinyNGCodeGenerator extends AngularCodeGeneratorBase {
  constructor() {
    super(TINYNG_CONFIG);
  }

  /** 组件库识别:用物料包全量组件集合(含 TiIcon 等,比 config.componentSelector 更全) */
  protected override getLibraryComponentNames(): Set<string> {
    return libraryComponents;
  }

  protected override processLibrarySpecificProp(
    componentName: string,
    key: string,
    rawItem: unknown,
    props: Record<string, unknown>,
    attrsArr: string[],
    _description: ICodegenDescription,
    _state: Record<string, unknown>,
    _schemaMethods?: Record<string, { value: string }>,
  ): boolean {
    const item = rawItem as { type?: string; value?: string; model?: { prop?: string } };
    const propType = this.resolvePropValueType(rawItem);

    if (componentName === 'TiPagination' && key === 'pageSizes' && propType === 'literal' && Array.isArray(rawItem)) {
      const pageSizeExpr = props['pageSize'] as { type?: string; value?: string } | undefined;
      const sizeValue = pageSizeExpr?.type === JS_EXPRESSION
        ? (pageSizeExpr.value ?? '').replace(/this\.(props\.)?/g, '')
        : `${rawItem[0] || 10}`;
      attrsArr.push(`[pageSize]="{ options: [${rawItem.join(', ')}], size: ${sizeValue} }"`);
      return true;
    }

    if (propType === JS_EXPRESSION) {

      if (componentName === 'TiPagination' && key === 'pageSize' && 'pageSizes' in props) {
        return true;
      }

      if (componentName === 'TiTable' && key === 'displayedData' && item.model) {
        attrsArr.push(`[(displayedData)]="${(item.value ?? '').replace(/this\.(props\.)?/g, '')}"`);
        return true;
      }

      if (componentName === 'TiTable' && key === 'srcData') {
        const rawValue = (item.value ?? '').replace(/this\.(props\.)?/g, '');
        attrsArr.push(`[srcData]="${rawValue}"`);
        return true;
      }

      if (componentName === 'TiPagination' && key === 'pageSize') {
        const rawValue = (item.value ?? '').replace(/this\.(props\.)?/g, '');
        attrsArr.push(`[pageSize]="{ size: ${rawValue} }"`);
        return true;
      }
    }

    return false;
  }

  protected override buildStateFields(schema: CardSchema, description: ICodegenDescription): string {
    const state = (schema as CardSchema & { state?: Record<string, unknown> }).state;
    if (state?.['srcData'] && typeof state['srcData'] === 'object' && !Array.isArray(state['srcData'])) {
      const srcData = state['srcData'] as Record<string, unknown>;
      if (srcData['state'] && typeof srcData['state'] === 'object' && !Array.isArray(srcData['state'])) {
        const srcState = srcData['state'] as Record<string, unknown>;
        if (srcState['searched'] === undefined) srcState['searched'] = false;
        if (srcState['sorted'] === undefined) srcState['sorted'] = false;
        if (srcState['paginated'] === undefined) srcState['paginated'] = false;
      }
    }
    return super.buildStateFields(schema, description);
  }

  protected override processLibrarySpecificChildren(
    componentName: string,
    children: NodeSchema[] | NodeSchema | string | undefined,
  ): NodeSchema[] | NodeSchema | string | undefined {
    if (componentName === 'TiFormField' && Array.isArray(children)) {
      return children.map((child) => {
        const childSchema = child as NodeSchema;
        if (childSchema.componentName === 'TiItem') {
          return childSchema;
        }
        return { componentName: 'TiItem', children: [childSchema] } as NodeSchema;
      });
    }
    return undefined;
  }
}

export const generateCode = (params: ICodeGeneratorParams): Promise<ICodeGeneratorResult> =>
  new TinyNGCodeGenerator().generate(params);
