import { A2UI_VENDOR_PATHS, readA2uiVendorJson, readA2uiVendorText } from './paths';

export const A2UI_OPEN_TAG = '<a2ui-json>';
export const A2UI_CLOSE_TAG = '</a2ui-json>';

export const A2UI_SCHEMA_BLOCK_START = '---BEGIN A2UI JSON SCHEMA---';
export const A2UI_SCHEMA_BLOCK_END = '---END A2UI JSON SCHEMA---';

/** 官方 Agent SDK `DEFAULT_WORKFLOW_RULES`（a2ui schema/constants.py）。 */
export const A2UI_DEFAULT_WORKFLOW_RULES = `
The generated response MUST follow these rules:
- The response can contain one or more A2UI JSON blocks.
- Each A2UI JSON block MUST be wrapped in \`${A2UI_OPEN_TAG}\` and \`${A2UI_CLOSE_TAG}\` tags.
- Between or around these blocks, you can provide conversational text.
- The JSON part MUST be a single, raw JSON object (usually a list of A2UI messages) and MUST validate against the provided A2UI JSON SCHEMA.
- Top-Down Component Ordering: Within the \`components\` list of a message:
    - The 'root' component MUST be the FIRST element.
    - Parent components MUST appear before their child components.
    This specific ordering allows the streaming parser to yield and render the UI incrementally as it arrives.
`.trim();

const DEFAULT_ROLE =
  'You are a helpful assistant. Your final output MUST be an A2UI UI definition.';

export type BuildA2uiSystemPromptOptions = {
  roleDescription?: string;
  uiDescription?: string;
  userAppendPrompt?: string;
};

/**
 * 对齐官方 DirectJsonPromptGenerator：role + workflow + UI rules + schema 块。
 * MVP 不注入 few-shot examples。
 */
export function buildA2uiSystemPrompt(options: BuildA2uiSystemPromptOptions = {}): string {
  const role = (options.roleDescription ?? DEFAULT_ROLE).trim();
  const catalogRules = readA2uiVendorText(A2UI_VENDOR_PATHS.rules).trim();
  const uiDescription = (options.uiDescription?.trim() || catalogRules).trim();

  const serverToClient = readA2uiVendorJson(A2UI_VENDOR_PATHS.serverToClient);
  const commonTypes = readA2uiVendorJson(A2UI_VENDOR_PATHS.commonTypes);
  const catalog = readA2uiVendorJson(A2UI_VENDOR_PATHS.catalog);

  const schemaBlock = [
    A2UI_SCHEMA_BLOCK_START,
    `### Server To Client Schema:\n${JSON.stringify(serverToClient)}`,
    `### Common Types Schema:\n${JSON.stringify(commonTypes)}`,
    `### Catalog Schema:\n${JSON.stringify(catalog)}`,
    A2UI_SCHEMA_BLOCK_END,
  ].join('\n\n');

  const parts = [
    role,
    `## Workflow Description:\n${A2UI_DEFAULT_WORKFLOW_RULES}`,
    `## UI Description:\n${uiDescription}`,
    schemaBlock,
  ];

  const append = options.userAppendPrompt?.trim();
  if (append) {
    parts.push(append);
  }

  return parts.join('\n\n');
}
