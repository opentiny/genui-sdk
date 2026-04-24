import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const requestTransformSource = readFileSync(
  new URL('../request-transform.ts', import.meta.url),
  'utf8',
);

test('requestTransform should skip prompt injection when metadata.tinygenui is missing', () => {
  assert.match(
    requestTransformSource,
    /if \(!customConfigString\)\s*\{\s*return newParams;\s*\}/,
  );
});

test('requestTransform should not default tinygenui metadata to an empty config', () => {
  assert.doesNotMatch(
    requestTransformSource,
    /tinygenui:\s*customConfigString\s*=\s*'\{\}'/,
  );
});
