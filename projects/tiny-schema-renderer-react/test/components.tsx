import * as Antd from 'antd';
import type { TabsProps } from 'antd';
import { Fragment, type ComponentType } from 'react';

const SKIP = new Set(['message', 'notification', 'unstableSetRender', 'version', 'theme', 'default']);

type TabItem = NonNullable<TabsProps['items']>[number];

function AntTabs({ items, ...rest }: TabsProps) {
  const normalizedItems = items?.map((item) => {
    const { children, ...itemRest } = item as TabItem;
    if (typeof children !== 'function') {
      return item;
    }
    const content = (children as () => unknown)();
    return {
      ...itemRest,
      children: Array.isArray(content) ? <Fragment>{content}</Fragment> : (content as TabItem['children']),
    };
  });

  return <Antd.Tabs {...rest} items={normalizedItems} />;
}

export const components: Record<string, ComponentType<any>> = Object.fromEntries(
  Object.entries(Antd)
    .filter(([name, value]) => !SKIP.has(name) && (typeof value === 'object' || typeof value === 'function'))
    .map(([name, value]) => [`Ant${name}`, value as ComponentType<any>]),
);

components.AntFormItem = Antd.Form.Item;
components.AntTabs = AntTabs;
