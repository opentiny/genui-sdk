import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** A2UI vendor pin（与 README / vendor/a2ui 一致）。 */
export const A2UI_VENDOR_VERSION = 'v0_9_1';

const here = path.dirname(fileURLToPath(import.meta.url));
/** packages/benchmarks 根目录 */
export const BENCHMARKS_PACKAGE_ROOT = path.resolve(here, '../../..');

export const A2UI_VENDOR_ROOT = path.join(BENCHMARKS_PACKAGE_ROOT, 'vendor/a2ui', A2UI_VENDOR_VERSION);

export const A2UI_VENDOR_PATHS = {
  serverToClient: path.join(A2UI_VENDOR_ROOT, 'json/server_to_client.json'),
  commonTypes: path.join(A2UI_VENDOR_ROOT, 'json/common_types.json'),
  catalog: path.join(A2UI_VENDOR_ROOT, 'catalogs/basic/catalog.json'),
  rules: path.join(A2UI_VENDOR_ROOT, 'catalogs/basic/rules.txt'),
} as const;

export function readA2uiVendorText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

export function readA2uiVendorJson<T = unknown>(filePath: string): T {
  return JSON.parse(readA2uiVendorText(filePath)) as T;
}
