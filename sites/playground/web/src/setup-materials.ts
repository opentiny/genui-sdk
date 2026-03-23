import { clearMaterials, registerMaterial, setNotify } from '../../../../projects/tiny-schema-renderer/index.js';
import {
  MATERIAL_NAME,
  componentMap,
  componentResolver,
  notifyAdapter,
} from '../../../../packages/materials/vue-opentiny-vue/src/extend-renderer';

export interface MaterialPlugin {
  id: string;
  source: Record<string, unknown> | ((name: string) => unknown);
  notify?: (opts: { type: string; title: string; message: string }) => void;
}

const materialPlugins = new Map<string, MaterialPlugin>([
  [
    'opentiny-custom',
    {
      id: 'opentiny-custom',
      source: componentMap,
      notify: notifyAdapter,
    },
  ],
  [
    'opentiny-native',
    {
      id: 'opentiny-native',
      source: componentResolver,
    },
  ],
]);

export const defaultMaterialPluginIds = ['opentiny-custom', 'opentiny-native'];

export function registerMaterialPlugin(plugin: MaterialPlugin) {
  materialPlugins.set(plugin.id, plugin);
}

export function applyMaterialPlugins(pluginIds: string[]) {
  clearMaterials();

  pluginIds.forEach((pluginId) => {
    const plugin = materialPlugins.get(pluginId);
    if (!plugin) return;
    registerMaterial(`${MATERIAL_NAME}:${plugin.id}`, plugin.source);
  });

  const notifyPlugin = pluginIds
    .map((pluginId) => materialPlugins.get(pluginId))
    .find((plugin) => plugin?.notify);

  if (notifyPlugin?.notify) {
    setNotify(notifyPlugin.notify);
  }
}

export function initializeMaterials(pluginIds: string[] = defaultMaterialPluginIds) {
  applyMaterialPlugins(pluginIds);
}
