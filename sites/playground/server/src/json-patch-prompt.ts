import { genBuilderPrompt } from '@opentiny/genui-sdk-core';

/**
 * @deprecated Use `genPrompt(..., { mode: 'builder' })` from
 * `@opentiny/genui-sdk-core` so Builder and Generate output contracts cannot conflict.
 */
export const generateJsonPatchPrompt = () => genBuilderPrompt({ validationLevel: 'strict' });
