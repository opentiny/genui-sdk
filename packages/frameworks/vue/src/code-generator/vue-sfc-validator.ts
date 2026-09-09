/* eslint-disable @typescript-eslint/no-use-before-define */
import { parse as parseSFC, compileScript, compileStyle, compileTemplate } from '@vue/compiler-sfc';
import { generateCodeFrame } from '@vue/shared';

const randomString = () => Math.random().toString(36).slice(2, 10);

export const validateByCompile = (filename: string, code: string): { message: string }[] => {
  const { errors, descriptor } = parseSFC(code, {
    filename,
    sourceMap: false,
  });

  if (errors.length) {
    return errors.map((error) => locateErrorMessage(code, error));
  }

  const id = randomString();

  let bindingMetadata;
  try {
    const scriptResult = compileScript(descriptor, { id });
    bindingMetadata = scriptResult.bindings;
  } catch (error) {
    const scriptError = unify(error);
    const loc =
      scriptError && typeof scriptError === 'object' && 'loc' in scriptError ? (scriptError as { loc?: { start?: unknown; line?: number; column?: number } }).loc : undefined;

    if (loc && !loc.start && loc.line != null) {
      const message = scriptError.message.match(/.*/)[0];
      const { line, column } = loc;

      return [locateErrorMessage(code, { message, loc: { start: { line, column } } })];
    }

    return [{ message: scriptError.message }];
  }

  const { styles, template, slotted } = descriptor;
  const scoped = styles.some((s) => s.scoped);

  if (template) {
    const templateResult = compileTemplate({
      source: template.content,
      filename,
      id,
      scoped,
      slotted,
      compilerOptions: { bindingMetadata },
    });

    if (templateResult.errors.length) {
      return templateResult.errors.map(unify).map((error) => locateErrorMessage(code, error));
    }
  }

  const stylesResult = styles.map(({ content }) => compileStyle({ source: content, filename, id, scoped }));
  const errorsInStyles = stylesResult
    .filter(({ errors }) => errors.length)
    .map(({ errors }) => errors)
    .flat();

  return errorsInStyles;
};

const unify = (error: string | Error): Error | { message: string; loc?: any } => {
  if (typeof error === 'string') {
    return { message: error };
  }

  return error;
};

const locateErrorMessage = (originalSource: string, error: { loc?: any; message: string }) => {
  let { loc, message } = error;

  if (loc?.start) {
    const { line, column } = loc.start;
    const lines = originalSource.split(/\r?\n/);
    const errorLineCode = lines[line - 1];

    if (typeof errorLineCode !== 'string') {
      return { message };
    }

    const SCOPE = 50;
    const scopeStartIndex = Math.max(0, column - SCOPE);
    const scopeCode = errorLineCode.slice(scopeStartIndex, column + SCOPE);

    message = `${message} \n ${generateCodeFrame(scopeCode, column - scopeStartIndex)}`;
  }

  return { message };
};
