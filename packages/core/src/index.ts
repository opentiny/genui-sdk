/**
 * @opentiny/genui-sdk-core — GenUI 核心能力统一入口。
 * - delta-patcher / protocols：流式 Schema 补丁与协议类型
 * - repair-json：不完整 JSON 修复
 * - stream-pattern-extractor / delta-json-path-selector：流解析与 JSON Path 选择
 * - prompt-generator：提示词生成辅助
 * 请通过本文件或 package.json 的 main/types 引用，避免深层路径导入。
 */
export * from './delta-patcher';
export * from './protocols';
export * from './prompt-generator';
export * from './delta-json-path-selector';
export * from './stream-pattern-extractor';
export * from './repair-json';
