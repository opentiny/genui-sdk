import { customDesignConfig } from '@opentiny/vue-common';
import { twMerge } from 'tailwind-merge';

// 单包版 @opentiny/vue-common 的 twMerge 是空实现，会把 mobile-first 模板按
// class map 生成的所有 Tailwind 类丢掉（组件只剩静态类），这里补上真实实现
customDesignConfig.twMerge = twMerge;
