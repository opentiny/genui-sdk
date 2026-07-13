import type { IMaterialsProtocol } from '../../material/materials-protocol';

export interface IUsefulPropInfo {
  property: string;
  description: string;
  required?: boolean;
  type: string;
  defaultValue: any;
  properties?: any;
}

function getI18n(desc: any) {
  const { zh_CN, text } = desc || {};
  return text?.zh_CN || zh_CN;
}

function getUsefulPropInfo(propsGroup: any) {
  const allProps = propsGroup.reduce((acc: any, curr: any) => {
    acc.push(...curr.content);
    return acc;
  }, []);
  return allProps.map((propInfo: any) => {
    const { property, description, label, required, type, defaultValue, properties } = propInfo;
    const usefulPropInfo: IUsefulPropInfo = {
      property,
      description: getI18n(description) || getI18n(label),
      type,
      defaultValue,
    };
    if (properties?.length > 0) {
      usefulPropInfo.properties = getUsefulPropInfo(properties);
    }
    return usefulPropInfo;
  });
}

function getUsefulEventInfo(events: any) {
  if (!events) {
    return {};
  }
  return Object.values(events).map((event: any) => {
    const { label, description } = event;
    delete event.label;
    delete event.description;
    event.description = getI18n(description) || getI18n(label);
    return event;
  });
}

const getUsefulSlotInfo = getUsefulEventInfo;

function getCmpSchemaInfo(schema: any) {
  const { properties, events, slots } = schema;
  return {
    properties: getUsefulPropInfo(properties),
    events: getUsefulEventInfo(events),
    slots: getUsefulSlotInfo(slots),
  };
}

function getUsefulInfo(componentInfo: any) {
  const { name, component, description, schema } = componentInfo;
  const usefulInfo = {
    name: getI18n(name),
    component,
    description,
    schema: getCmpSchemaInfo(schema),
  };

  return usefulInfo;
}

function filterComponent(component: any, whiteList: string[]) {
  if (!(whiteList.length > 0)) {
    return true;
  }
  if (whiteList.includes(component?.component)) {
    return true;
  }
  return false;
}

function extractComponents(materials: any[], whiteList: string[]) {
  return materials
    .map((material) => material.data.materials.components)
    .filter((i) => i)
    .flat()
    .filter((component) => filterComponent(component, whiteList));
}

export function getComponentsName(materials: IMaterialsProtocol[], whiteList: string[]) {
  return extractComponents(materials, whiteList).map((component) => component.component);
}

export function getComponentsInfo(materials: IMaterialsProtocol[], whiteList: string[]) {
  return extractComponents(structuredClone(materials), whiteList).map(getUsefulInfo);
}
