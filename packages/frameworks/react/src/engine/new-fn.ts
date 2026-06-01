import type { RendererSettings } from './types';

let rendererSettings: RendererSettings = {};

export function setRendererSettings(settings: RendererSettings) {
  rendererSettings = settings;
}

export function getRendererSettings() {
  return rendererSettings;
}

export function newFn(...argv: string[]) {
  const Fn = rendererSettings.Function ?? Function;
  return new Fn(...argv);
}
