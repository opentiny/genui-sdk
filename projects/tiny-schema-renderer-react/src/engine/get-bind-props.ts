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
  const { componentName } = schema;
  const bindProps: Record<string, unknown> = {
    ...((parseData(schema.props, scope, context) as Record<string, unknown>) || {}),
    'data-id': schema.id,
    'data-tag': componentName,
  };
  if (context.cssScopeId) {
    bindProps[context.cssScopeId] = '';
  }

  applyDefaultPropsToProps(componentName, bindProps, getCustomSettings()?.defaultPropsMap);

  return normalizeDomProps(bindProps);
}
