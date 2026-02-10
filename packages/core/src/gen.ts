import { genPrompt } from './prompt-generator';
import { rendererConfig } from '../../materials/vue-opentiny-vue/src/render-config/merge';
import fs from 'node:fs';

const placeholderPrompt = genPrompt(rendererConfig, {}, { isSkill: true })


fs.writeFileSync('./prompt.ts', 'export default ' + JSON.stringify(placeholderPrompt, null, 2));