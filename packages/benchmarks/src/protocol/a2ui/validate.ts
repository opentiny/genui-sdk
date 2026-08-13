import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { ProtocolValidationResult } from '../types';
import { describeMissingA2uiJsonBlock, extractA2uiJsonBlock } from './extract';
import { A2UI_VENDOR_PATHS, readA2uiVendorJson } from './paths';

type JsonSchema = Record<string, unknown>;

let cachedValidate: ValidateFunction | undefined;

/**
 * Draft 2020-12 AJV：注册 common_types（绝对 $id）+ catalog（相对 `catalog.json` 解析目标）+ server_to_client。
 */
function getA2uiMessageValidator(): ValidateFunction {
  if (cachedValidate) return cachedValidate;

  const commonTypes = readA2uiVendorJson<JsonSchema>(A2UI_VENDOR_PATHS.commonTypes);
  const catalogRaw = readA2uiVendorJson<JsonSchema>(A2UI_VENDOR_PATHS.catalog);
  const serverToClient = readA2uiVendorJson<JsonSchema>(A2UI_VENDOR_PATHS.serverToClient);

  // server_to_client 内相对 ref `catalog.json#...` 相对其 $id
  // `https://a2ui.org/specification/v0_9/server_to_client.json` 解析为
  // `https://a2ui.org/specification/v0_9/catalog.json`
  const catalogForRelativeRefs: JsonSchema = {
    ...catalogRaw,
    $id: 'https://a2ui.org/specification/v0_9/catalog.json',
  };

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateSchema: false,
  });
  addFormats(ajv);
  ajv.addSchema(commonTypes);
  ajv.addSchema(catalogForRelativeRefs);
  cachedValidate = ajv.compile(serverToClient);
  return cachedValidate;
}

function formatAjvError(err: ErrorObject): string {
  const instancePath = err.instancePath || '(root)';
  const msg = err.message ?? 'validation failed';
  return `${instancePath}: ${msg}`;
}

/**
 * oneOf 失败时 AJV 常先报 CreateSurface 分支的 required；优先挑与消息实际类型相关的错误。
 */
function formatPrimaryAjvError(msg: unknown, errors: ErrorObject[] | null | undefined): string {
  if (!errors?.length) return 'unknown AJV error';
  const present = MESSAGE_KEYS.filter(
    (k) => msg !== null && typeof msg === 'object' && !Array.isArray(msg) && k in (msg as object),
  );
  const preferred =
    errors.find((e) => present.some((k) => e.instancePath === `/${k}` || e.instancePath.startsWith(`/${k}/`))) ??
    errors.find((e) => e.instancePath.length > 0) ??
    errors[0];
  return formatAjvError(preferred);
}

const MESSAGE_KEYS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'] as const;

function looksLikeA2uiMessage(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return MESSAGE_KEYS.some((k) => k in obj);
}

/**
 * 将块内 JSON 规范为 A2UI 消息数组。
 */
export function normalizeA2uiMessages(parsed: unknown): unknown[] | { error: string } {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return { error: 'A2UI JSON array is empty' };
    }
    return parsed;
  }
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.messages)) {
      if (obj.messages.length === 0) {
        return { error: 'A2UI messages array is empty' };
      }
      return obj.messages;
    }
    if (looksLikeA2uiMessage(parsed)) {
      return [parsed];
    }
  }
  return {
    error:
      'A2UI JSON must be a message object, an array of messages, or { messages: [...] }',
  };
}

/**
 * 提取 → JSON.parse → 逐条 AJV 校验 A2UI v0.9.1 envelope。
 */
export function validateA2uiOutput(sourceOutput: string): ProtocolValidationResult {
  const block = extractA2uiJsonBlock(sourceOutput);
  if (!block) {
    return {
      isSchemaJsonBlockFound: false,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: describeMissingA2uiJsonBlock(sourceOutput),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: `A2UI JSON parse failed: ${detail}`,
    };
  }

  const normalized = normalizeA2uiMessages(parsed);
  if ('error' in normalized) {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: true,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: normalized.error,
    };
  }

  const validate = getA2uiMessageValidator();
  for (let i = 0; i < normalized.length; i++) {
    const msg = normalized[i];
    const ok = validate(msg);
    if (!ok) {
      const detail = formatPrimaryAjvError(msg, validate.errors);
      return {
        isSchemaJsonBlockFound: true,
        isSchemaJsonValidJson: true,
        isSchemaJsonValidAgainstProtocol: false,
        schemaValidationError: `messages[${i}] ${detail}`,
      };
    }
  }

  return {
    isSchemaJsonBlockFound: true,
    isSchemaJsonValidJson: true,
    isSchemaJsonValidAgainstProtocol: true,
  };
}
