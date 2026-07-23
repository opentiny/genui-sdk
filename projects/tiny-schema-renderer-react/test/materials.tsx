import * as Antd from 'antd';
import type { ComponentType } from 'react';

const SKIP = new Set(['message', 'notification', 'unstableSetRender', 'version', 'theme', 'default']);

export const materials: Record<string, ComponentType<any>> = Object.fromEntries(
  Object.entries(Antd)
    .filter(([name, value]) => !SKIP.has(name) && (typeof value === 'object' || typeof value === 'function'))
    .map(([name, value]) => [`Ant${name}`, value as ComponentType<any>]),
);

materials.AntFormItem = Antd.Form.Item;
