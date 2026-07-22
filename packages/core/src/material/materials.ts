export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  [key: string]: any;
}

export function mergeMaterials(...materialsList: IMaterials[]): IMaterials {
  return materialsList.reduce<IMaterials>(
    (acc, cur) => ({
      ...acc,
      ...cur,
      components: { ...acc.components, ...cur.components },
      requiredCompleteFieldSelectors: [
        ...(acc.requiredCompleteFieldSelectors ?? []),
        ...(cur.requiredCompleteFieldSelectors ?? []),
      ],
      defaultPropsMap: { ...acc.defaultPropsMap, ...cur.defaultPropsMap },
    }),
    {},
  );
}
