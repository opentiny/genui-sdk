import type { IBuilderCardMessageItem } from './builder-schema-utils';

export interface IBuilderPreviewBridge {
  openCard: (card: IBuilderCardMessageItem) => void;
}

let previewBridge: IBuilderPreviewBridge | null = null;

export function registerBuilderPreviewBridge(bridge: IBuilderPreviewBridge) {
  previewBridge = bridge;
}

export function unregisterBuilderPreviewBridge() {
  previewBridge = null;
}

export function getBuilderPreviewBridge() {
  return previewBridge;
}