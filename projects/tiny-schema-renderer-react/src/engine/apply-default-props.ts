type DefaultValue = any
type PropsValue = any;

interface PropsRecord {
  [key: string]: PropsValue;
}

type DefaultValueMap = Record<string, DefaultValue>;

export type DefaultPropsMap = Record<string, DefaultValueMap>;

const isObjectRecord = (value: unknown): value is PropsRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneDefaultValue = (value: DefaultValue): DefaultValue => {
  if (!isObjectRecord(value) && !Array.isArray(value)) {
    return value;
  }
  return JSON.parse(JSON.stringify(value)) as DefaultValue;
};

const fillMissingValue = (
  target: PropsRecord,
  propertyPath: string,
  defaultValue: DefaultValue,
): void => {
  const keys = propertyPath.split('.');
  let current: PropsRecord = target;

  for (const key of keys.slice(0, -1)) {
    const nextValue = current[key];
    if (nextValue == null) {
      current[key] = {};
      current = current[key] as PropsRecord;
      continue;
    }

    if (!isObjectRecord(nextValue)) {
      return;
    }

    current = nextValue;
  }

  const leafKey = keys[keys.length - 1];
  if (current[leafKey] == null) {
    current[leafKey] = cloneDefaultValue(defaultValue);
  }
};

export const applyDefaultPropsToProps = (
  componentName: string,
  props: PropsRecord,
  defaultPropsMap: DefaultPropsMap | null | undefined,
): void => {
  if (typeof componentName !== 'string' || !isObjectRecord(defaultPropsMap)) {
    return;
  }

  const componentDefaults = defaultPropsMap[componentName];
  if (!componentDefaults) {
    return;
  }

  Object.entries(componentDefaults).forEach(([propertyPath, defaultValue]) => {
    fillMissingValue(props, propertyPath, defaultValue);
  });
};
