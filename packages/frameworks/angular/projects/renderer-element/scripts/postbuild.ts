
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesPath = join(import.meta.dirname, '../../../dist/renderer-element/browser/styles.css');

const styles = readFileSync(stylesPath, 'utf-8');

let replacedStyles = styles.replace(/genui-renderer-ng-element\sbody\s*\{/g, 'genui-renderer-ng-element {');
replacedStyles = replacedStyles.replace(/genui-renderer-ng-element\s\:root\s*\{/g, 'genui-renderer-ng-element {');

writeFileSync(stylesPath, replacedStyles);