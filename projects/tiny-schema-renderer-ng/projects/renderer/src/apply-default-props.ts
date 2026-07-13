export type PropsValue = any;
export type DefaultValue = any;
type DefaultValueMap = Record<string, PropsValue>;
export type DefaultPropsMap = Record<string, DefaultValueMap>;

type Container = Record<string, PropsValue> | PropsValue[];

function isContainer(value: PropsValue): value is Container {
  return typeof value === 'object' && value !== null;
}

function cloneDefaultValue(value: PropsValue): PropsValue {
  if (!isContainer(value)) {
    return value;
  }
  return structuredClone(value);
}

function getChild(container: Container, key: string): PropsValue {
  if (Array.isArray(container) && /^\d+$/.test(key)) {
    return container[Number(key)];
  }
  return (container as Record<string, PropsValue>)[key];
}

function setChild(container: Container, key: string, value: PropsValue): void {
  if (Array.isArray(container) && /^\d+$/.test(key)) {
    container[Number(key)] = value;
  } else {
    (container as Record<string, PropsValue>)[key] = value;
  }
}

function fillAtPath(
  current: Container,
  keys: string[],
  defaultValue: DefaultValue,
): void {
  if (!keys.length) {
    return;
  }

  const [key, ...rest] = keys;

  if (key === '*' && Array.isArray(current)) {
    for (let i = 0; i < current.length; i++) {
      if (!rest.length) {
        if (current[i] == null) {
          current[i] = cloneDefaultValue(defaultValue);
        }
        continue;
      }
      const item = current[i];
      if (item == null || !isContainer(item)) {
        continue;
      }
      fillAtPath(item, rest, defaultValue);
    }
    return;
  }

  if (!rest.length) {
    if (getChild(current, key) == null) {
      setChild(current, key, cloneDefaultValue(defaultValue));
    }
    return;
  }

  const nextValue = getChild(current, key);
  if (nextValue == null) {
    return;
  }

  if (rest[0] === '*' && Array.isArray(nextValue)) {
    fillAtPath(nextValue, rest, defaultValue);
    return;
  }

  if (!isContainer(nextValue)) {
    return;
  }

  fillAtPath(nextValue, rest, defaultValue);
}

function fillMissingValue(
  target: Record<string, PropsValue>,
  propertyPath: string,
  defaultValue: DefaultValue,
): void {
  fillAtPath(target, propertyPath.split('.'), defaultValue);
}

export function applyDefaultPropsToProps(
  componentName: string,
  props: Record<string, PropsValue>,
  defaultPropsMap: DefaultPropsMap | null | undefined,
): void {
  if (typeof componentName !== 'string' || !isContainer(defaultPropsMap)) {
    return;
  }

  const componentDefaults = defaultPropsMap[componentName];
  if (!componentDefaults) {
    return;
  }

  Object.entries(componentDefaults).forEach(([propertyPath, defaultValue]) => {
    fillMissingValue(props, propertyPath, defaultValue);
  });
}
