import { generateCode } from '@opentiny/genui-angular-code-generator';

/**
 * Angular 出码:前端直接调用 code-generator 源码的 generateCode(见 vite.config.ts 的
 * resolve.alias 与 tsconfig 的 paths),把 schema 生成 .component.ts 源码并下载。
 * 与 use-generate-vue-code.ts 的体验对齐;Angular 出码器依赖 @angular/compiler + TinyNG
 * 物料包组件类,打包体积较大,故仅在使用时按需引用。
 */

const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useGenerateAngularCode = () => {
  const exportAngularCode = async (schema: string | object): Promise<void> => {
    const result = await generateCode({ pageInfo: { schema: schema as never } });

    if (result.errors?.length) {
      console.error('生成代码校验出错：', result.errors);
    }

    // panelName 形如 xxx.component.ts,已带扩展名,直接用作下载文件名
    downloadTextFile(result.panelName || 'SchemaCard.component.ts', result.panelValue);
  };

  return {
    exportAngularCode,
  };
};
