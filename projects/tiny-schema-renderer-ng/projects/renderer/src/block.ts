import { blockComponentFactory } from './render-block';
import { MATERIALS_CONTEXT_KEY } from './renderer-materials';
import { BLOCK_CONTEXT_KEY } from './renderer-settings';

export function defineBlock(name: string, schema: {
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
}) {
  return blockComponentFactory(name, schema);
}

function getBlockCache(context: any) {
  return context[BLOCK_CONTEXT_KEY]
}

export function loadBlock(name: string, context: any) {
  const schema = context[MATERIALS_CONTEXT_KEY]?.blocks?.[name]
  if (!schema) return null
  const cache = getBlockCache(context)
  if (!cache) return null
  if (!cache[name]) {
    cache[name] = defineBlock(name, schema)
  }
  return cache[name]
}

export function getBlock(name: string, context: any) {
  if (!context[MATERIALS_CONTEXT_KEY]?.blocks?.[name]) return null
  return getBlockCache(context)?.[name] || loadBlock(name, context)
}
