import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

type TabItem = NonNullable<TabsProps['items']>[number];

type AntTabsWrapProps = TabsProps;

function normalizeItems(items?: TabItem[]): TabItem[] | undefined {
  if (!items?.length) return items;

  return items.map((item) => {
    const { children, ...rest } = item;
    if (typeof children === 'function') {
      const content = children();
      return {
        ...rest,
        children: Array.isArray(content) ? <Fragment>{content}</Fragment> : content,
      };
    }
    return item;
  });
}

export function AntTabsWrap({
  items,
  activeKey: controlledActiveKey,
  defaultActiveKey,
  onChange,
  ...rest
}: AntTabsWrapProps) {
  const userClickedRef = useRef(false);
  const prevCountRef = useRef(0);
  const [activeKey, setActiveKey] = useState<string | undefined>(
    controlledActiveKey ?? defaultActiveKey,
  );

  const normalizedItems = useMemo(() => normalizeItems(items), [items]);
  const itemCount = normalizedItems?.length ?? 0;

  useEffect(() => {
    if (userClickedRef.current || itemCount <= prevCountRef.current) {
      prevCountRef.current = itemCount;
      return;
    }
    const lastKey = normalizedItems?.[itemCount - 1]?.key;
    if (lastKey != null) {
      setActiveKey(String(lastKey));
    }
    prevCountRef.current = itemCount;
  }, [itemCount, normalizedItems]);

  useEffect(() => {
    if (controlledActiveKey != null) {
      setActiveKey(String(controlledActiveKey));
    }
  }, [controlledActiveKey]);

  return (
    <Tabs
      {...rest}
      items={normalizedItems}
      activeKey={controlledActiveKey ?? activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={(key) => {
        userClickedRef.current = true;
        setActiveKey(key);
        onChange?.(key);
      }}
    />
  );
}
