import type { ReactNode } from 'react';
import { Text } from './Text';
import type { ComponentRegistry } from '../materials';

function Page({ children }: { children?: ReactNode }) {
  return <div className="genui-page">{children}</div>;
}

export const builtinMaterials: ComponentRegistry = {
  Page,
  Text,
};
