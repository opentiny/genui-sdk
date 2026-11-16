import { Text } from './Text';
import { Slot } from '../block/Slot';
import type { ComponentRegistry } from '../materials';

export const builtinMaterials: ComponentRegistry = {
  Text,
  Slot,
  slot: Slot,
};
