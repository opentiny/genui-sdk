import {  genPrompt } from './prompt-generator';
import { rendererConfig } from '../../materials/vue-opentiny-vue/src/render-config/merge';

const placeholderPrompt = genPrompt(rendererConfig, {}, { isSkill: true })


console.log(placeholderPrompt);