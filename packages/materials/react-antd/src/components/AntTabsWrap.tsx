import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import type { ReactNode } from 'react';
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';

type AntTabsWrapProps = TabsProps & {
  children?: ReactNode;
};

/**
 * Tabs 流式渲染包装：子 Tab 数量增加时自动切到最新 Tab，对齐 Vue TinyTabsWrap。
 */
export function AntTabsWrap({
  children,
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

  const childArray = Children.toArray(children);
  const childCount = childArray.length;

  useEffect(() => {
    if (userClickedRef.current || childCount <= prevCountRef.current) {
      prevCountRef.current = childCount;
      return;
    }
    const last = childArray[childCount - 1];
    const nextKey = isValidElement(last) ? String(last.key ?? '') : '';
    if (nextKey) {
      setActiveKey(nextKey);
    }
    prevCountRef.current = childCount;
  }, [childCount, childArray]);

  useEffect(() => {
    if (controlledActiveKey != null) {
      setActiveKey(String(controlledActiveKey));
    }
  }, [controlledActiveKey]);

  return (
    <Tabs
      {...rest}
      activeKey={controlledActiveKey ?? activeKey}
      defaultActiveKey={defaultActiveKey}
      onChange={(key) => {
        setActiveKey(key);
        onChange?.(key);
      }}
      onTabClick={() => {
        userClickedRef.current = true;
      }}
    >
      {children}
    </Tabs>
  );
}
