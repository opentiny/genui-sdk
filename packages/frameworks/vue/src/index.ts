export * from './chat';
export * from './renderer';
export * from './config-provider';
export * from './code-generator';
export * from './legacy-chat';
export * from './legacy-renderer';
import { RENDERER_SETTINGS_KEY as RENDERER_SETTINGS_KEY_IMPL } from '@opentiny/tiny-schema-renderer';

export const RENDERER_SETTINGS_KEY: symbol = RENDERER_SETTINGS_KEY_IMPL;
