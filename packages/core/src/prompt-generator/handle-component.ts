import type { IMaterials } from '../protocols/materials';
import type { IWhiteList } from './prompt';

export interface IUsefulPropInfo {
  property: string;
  description: string;
  required: boolean;
  type: string;
  defaultValue: any;
  properties?: any;
}

const getI18n = (desc: any) => {
  const { zh_CN, text } = desc || {};
  return text?.zh_CN || zh_CN;
};

const getUsefulPropInfo = (propsGroup: any) => {
  const allProps = propsGroup.reduce((acc: any, curr: any) => {
    acc.push(...curr.content);
    return acc;
  }, []);
  return allProps.map((propInfo: any) => {
    const { property, description, label, required, type, defaultValue, properties } = propInfo;
    const usefulPropInfo: IUsefulPropInfo = {
      property,
      description: getI18n(description) || getI18n(label),
      required,
      type,
      defaultValue,
    };
    if (properties?.length > 0) {
      usefulPropInfo.properties = getUsefulPropInfo(properties);
    }
    return usefulPropInfo;
  });
};

const getUsefulEventInfo = (events: any) => {
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
};

const getUsefulSlotInfo = getUsefulEventInfo;

const getCmpSchemaInfo = (schema: any) => {
  const { properties, events, slots } = schema;
  return {
    properties: getUsefulPropInfo(properties),
    events: getUsefulEventInfo(events),
    slots: getUsefulSlotInfo(slots),
  };
};

const getUsefulInfo = (componentInfo: any) => {
  const { name, component, description, schema } = componentInfo;
  const usefulInfo = {
    name: getI18n(name),
    component,
    description,
    schema: getCmpSchemaInfo(schema),
  };

  return usefulInfo;
};

const filterComponent = (component: any, whiteList: IWhiteList) => {
  if (!(whiteList.length > 0)) {
    return true;
  }
  if (whiteList.includes(component?.component)) {
    return true;
  }
  return false;
};

const extractComponents = (materialsList: any[], whiteList: IWhiteList) => {
  return materialsList
    .map((material) => material.data.materials.components)
    .filter((i) => i)
    .flat()
    .filter((component) => filterComponent(component, whiteList));
};

export const getComponentsName = (materialsList: IMaterials[], whiteList: IWhiteList) => {
  return extractComponents(materialsList, whiteList).map((component) => component.component);
};

export const getComponentsInfo = (materialsList: IMaterials[], whiteList: IWhiteList) => {
  return extractComponents(structuredClone(materialsList), whiteList).map(getUsefulInfo);
};
