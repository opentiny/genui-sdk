import { createContext, useContext } from 'react';
import type { BlockEventDispatcher, BlockSlots } from './types';

export interface BlockContextValue {
  name: string;
  props: Record<string, unknown>;
  dispatchEvent: BlockEventDispatcher;
  slots: BlockSlots;
}

export const BlockContext = createContext<BlockContextValue | null>(null);

export function useBlockContext(): BlockContextValue | null {
  return useContext(BlockContext);
}
