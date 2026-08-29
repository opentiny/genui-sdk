import { JS_EXPRESSION } from '../../constants';
import type { IAngularPropContext } from '../prop-adapter';
import { AngularPropAdapter } from '../prop-adapter';

/** TiPagination.pageSizes(literal 数组)→ 合并进单个 [pageSize]="{ options, size }" 绑定 */
class PageSizesAdapter extends AngularPropAdapter {
  readonly name = 'TiPagination:pageSizes';

  tryHandle(ctx: IAngularPropContext): boolean {
    const { componentName, key, rawItem, props, attrsArr, resolvePropValueType, cleanThisInTemplate } = ctx;
    if (componentName !== 'TiPagination' || key !== 'pageSizes' || !Array.isArray(rawItem)) return false;
    if (resolvePropValueType(rawItem) !== 'literal') return false;

    // TiPagination 用单个 [pageSize] 接收 { options, size },size 取兄弟属性 pageSize 的表达式值
    const pageSizeExpr = props['pageSize'] as { type?: string; value?: string } | undefined;
    const sizeValue = pageSizeExpr?.type === JS_EXPRESSION
      ? cleanThisInTemplate(pageSizeExpr.value ?? '')
      : `${rawItem[0] || 10}`;
    attrsArr.push(`[pageSize]="{ options: [${rawItem.join(', ')}], size: ${sizeValue} }"`);
    return true;
  }
}

/** TiTable.displayedData(JSExpression + model)→ 双向绑定 */
class DisplayedDataAdapter extends AngularPropAdapter {
  readonly name = 'TiTable:displayedData';

  tryHandle(ctx: IAngularPropContext): boolean {
    const { componentName, key, rawItem, attrsArr, resolvePropValueType, cleanThisInTemplate } = ctx;
    if (componentName !== 'TiTable' || key !== 'displayedData') return false;
    const item = rawItem as { type?: string; value?: string; model?: { prop?: string } };
    if (resolvePropValueType(rawItem) !== JS_EXPRESSION || !item.model) return false;

    attrsArr.push(`[(displayedData)]="${cleanThisInTemplate(item.value ?? '')}"`);
    return true;
  }
}

/** TiTable.srcData(JSExpression)→ 单绑 */
class SrcDataAdapter extends AngularPropAdapter {
  readonly name = 'TiTable:srcData';

  tryHandle(ctx: IAngularPropContext): boolean {
    const { componentName, key, rawItem, attrsArr, resolvePropValueType, cleanThisInTemplate } = ctx;
    if (componentName !== 'TiTable' || key !== 'srcData') return false;
    if (resolvePropValueType(rawItem) !== JS_EXPRESSION) return false;

    const value = (rawItem as { value?: string }).value ?? '';
    attrsArr.push(`[srcData]="${cleanThisInTemplate(value)}"`);
    return true;
  }
}

/** TiPagination.pageSize(JSExpression)→ 包成 { size } 对象;若同时有 pageSizes 则已被 PageSizesAdapter 合并消费 */
class PageSizeAdapter extends AngularPropAdapter {
  readonly name = 'TiPagination:pageSize';

  tryHandle(ctx: IAngularPropContext): boolean {
    const { componentName, key, rawItem, props, attrsArr, resolvePropValueType, cleanThisInTemplate } = ctx;
    if (componentName !== 'TiPagination' || key !== 'pageSize') return false;
    if (resolvePropValueType(rawItem) !== JS_EXPRESSION) return false;

    if ('pageSizes' in props) return true; // 已被合并进 pageSizes 的 [pageSize] 绑定,吞掉
    const value = (rawItem as { value?: string }).value ?? '';
    attrsArr.push(`[pageSize]="{ size: ${cleanThisInTemplate(value)} }"`);
    return true;
  }
}

/** TinyNG 组件 prop 特判适配器注册表:按声明顺序逐个尝试,首个命中者消费该 prop */
export const TINY_NG_PROP_ADAPTERS: AngularPropAdapter[] = [
  new PageSizesAdapter(),
  new DisplayedDataAdapter(),
  new SrcDataAdapter(),
  new PageSizeAdapter(),
];
