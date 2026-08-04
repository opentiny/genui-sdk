import { ref, readonly, type Ref } from 'vue';
import { componentLibOptionsByFramework, defaultComponentLib } from '../components/materials-tab';

export interface FrameworkCache {
  framework?: unknown;
  componentLib?: unknown;
}

function validateCache(cache: FrameworkCache): { framework: string; componentLib: string } {
  const framework = cache.framework === 'Angular' ? 'Angular' : 'Vue';

  const allowedLibs = componentLibOptionsByFramework[framework] ?? [];
  const componentLib =
    typeof cache.componentLib === 'string' && allowedLibs.includes(cache.componentLib)
      ? cache.componentLib
      : defaultComponentLib[framework];

  return { framework, componentLib };
}

export function useFrameworkConfig(initialCache: FrameworkCache = {}) {
  const validated = validateCache(initialCache);

  const _framework = ref<string>(validated.framework);
  const _componentLib = ref<string>(validated.componentLib);

  function setFramework(name: string): void {
    if (name !== 'Vue' && name !== 'Angular') {
      return;
    }
    _framework.value = name;
    _componentLib.value = defaultComponentLib[name];
  }

  function setComponentLib(name: string): void {
    const allowed = componentLibOptionsByFramework[_framework.value] ?? [];
    if (allowed.includes(name)) {
      _componentLib.value = name;
    }
  }

  return {
    framework: readonly(_framework) as Readonly<Ref<string>>,
    componentLib: readonly(_componentLib) as Readonly<Ref<string>>,
    setFramework,
    setComponentLib,
  };
}
