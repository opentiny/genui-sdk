
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const stylesPath = join(import.meta.dirname, '../../../dist/renderer-element/browser/styles.css');

const styles = readFileSync(stylesPath, 'utf-8');

let replacedStyles = styles.replace(
  /genui-renderer-ng-element\s+(?:html|body|:root)\s*\{/g,
  'genui-renderer-ng-element {',
);
replacedStyles = replacedStyles.replace(/ti-drop\s+(?:html|body|:root)\s*\{/g, 'ti-drop {');
replacedStyles = replacedStyles.replace(
  /\.cdk-overlay-container\s+(?:html|body|:root)\s*\{/g,
  '.cdk-overlay-container {',
);

writeFileSync(stylesPath, replacedStyles);
