import type { ReactNode } from 'react';
import { Box } from './Box';
import { Text } from './Text';
import { Img } from './Img';
import { Button } from './Button';
import { Input } from './Input';
import { Slot } from './Slot';
import type { ComponentRegistry } from '../materials';

function Page({ children }: { children?: ReactNode }) {
  return <div className="genui-page">{children}</div>;
}

/** 内置物料组件表，对齐 Vue 物料包直接映射 componentName → Component。 */
export const builtinMaterials: ComponentRegistry = {
  Page,
  Box,
  div: Box,
  Text,
  span: Text,
  Img,
  img: Img,
  Button,
  button: Button,
  Input,
  input: Input,
  Slot,
};
