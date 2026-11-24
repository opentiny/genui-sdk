export interface BlockPropertyContent {
  property?: string
}

export interface BlockPropertyGroup {
  content?: BlockPropertyContent[]
}

/** 区块对外接口。properties 是输入，events 是输出。 */
export interface BlockComponentSchema {
  properties?: BlockPropertyGroup[]
  events?: Record<string, unknown>
  slots?: Record<string, unknown>
  projectionSelectors?: Record<string, unknown>
}

/** 区块渲染树节点。children 与根节点同形，供 NgContent 投影遍历。 */
export interface BlockSchemaNode {
  componentName?: string
  props?: Record<string, unknown>
  children?: BlockSchemaNode[] | string
  directives?: unknown[]
  [key: string]: unknown
}

/** 区块 schema：渲染树根字段加上对外接口 schema。 */
export interface BlockSchema extends BlockSchemaNode {
  state?: Record<string, unknown>
  contentRefs?: Record<string, string>
  schema?: BlockComponentSchema
}

const ON_RE = /^on([A-Z].*)$/

/**
 * 物料事件名转 Angular output 名：去掉 on 前缀并小写首字母。
 * onClickText -> clickText。已经是 output 名时原样返回。
 */
export function toBlockOutputName(eventName: string): string {
  const on = ON_RE.exec(eventName)
  if (!on) return eventName
  const rest = on[1]
  return rest.charAt(0).toLowerCase() + rest.slice(1)
}

function unique(names: string[]): string[] {
  return [...new Set(names)]
}

/** 区块 inputs：schema.properties[].content[].property */
export function getBlockInputNames(block: BlockSchema): string[] {
  const names: string[] = []
  for (const group of block.schema?.properties ?? []) {
    for (const item of group?.content ?? []) {
      if (item?.property) names.push(item.property)
    }
  }
  return unique(names)
}

/** 区块 outputs：schema.events 的键，去掉 on 前缀 */
export function getBlockOutputNames(block: BlockSchema): string[] {
  return unique(Object.keys(block.schema?.events ?? {}).map(toBlockOutputName))
}
