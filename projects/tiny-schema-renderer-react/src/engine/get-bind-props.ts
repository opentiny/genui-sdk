import { parseData } from './parse-data';
import { normalizeDomProps } from './parse-inline-style';
import { applyDefaultPropsToProps } from './apply-default-props';
import { getCustomSettings } from './use-custom-setting';
import type { Node } from '../types';
import type { PageContextValue } from './parse-data';

export function getBindProps(
  schema: Node,
  scope: Record<string, unknown>,
  context: PageContextValue,
): Record<string, unknown> {
  const { componentName, id } = schema;
  const raw: Record<string, unknown> = {
    ...((parseData(schema.props, scope, context) as Record<string, unknown>) || {}),
    'data-id': id,
    'data-tag': componentName,
  };
  if (context.cssScopeId) {
    raw[context.cssScopeId] = '';
  }

  applyDefaultPropsToProps(componentName, raw, getCustomSettings()?.defaultPropsMap);

  return normalizeDomProps(raw);
}
