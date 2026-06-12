import type { RendererSettings } from './types';

let rendererSettings: RendererSettings = {};

export function setRendererSettings(settings: RendererSettings) {
  const { materials, ...rest } = settings;
  rendererSettings = { ...rendererSettings, ...rest };
  if (materials) {
    rendererSettings.materials = { ...(rendererSettings.materials ?? {}), ...materials };
  }
}

export function getRendererSettings() {
  return rendererSettings;
}

export function newFn(...argv: string[]) {
  const Fn = rendererSettings.Function ?? Function;
  return new Fn(...argv);
}
