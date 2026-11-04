import { transform } from '@babel/standalone';

export function validateByCompile(filename: string, source: string): { message: string }[] {
  try {
    transform(source, {
      filename,
      sourceType: 'module',
      presets: [
        ['react', { runtime: 'automatic' }],
        ['typescript', { allExtensions: true, isTSX: true }],
      ],
    });
    return [];
  } catch (error) {
    return [{ message: error instanceof Error ? error.message : String(error) }];
  }
}
