import { extractTitleFromSchema } from './builder-schema-utils';

export const LEGACY_SCHEMA_CARD_CREATED_TIME = '1970-01-01 00:00:01';

function normalizeSchemaContent(content: unknown) {
  if (typeof content === 'string') {
    return content;
  }

  if (content == null) {
    return '';
  }

  try {
    return JSON.stringify(content);
  } catch {
    return '';
  }
}

export interface IBuilderCardRendererItem {
  id?: string;
  title?: string;
  input?: string;
  schema?: string;
  content?: unknown;
  createdTime?: string;
}

export function buildBuilderCardProps(props: IBuilderCardRendererItem) {
  const schema = normalizeSchemaContent(props.schema ?? props.content);
  return {
    id: props.id ?? '',
    title: props.title ?? extractTitleFromSchema(schema, props.input ?? ''),
    input: props.input ?? '',
    schema,
    createdTime: props.createdTime ?? LEGACY_SCHEMA_CARD_CREATED_TIME,
  };
}
