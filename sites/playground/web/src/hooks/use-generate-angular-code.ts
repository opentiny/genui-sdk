import { generateCode as generateAngularCode } from '@opentiny/genui-sdk-angular/code-generator';

const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = /\.ts$/i.test(filename) ? filename : `${filename}.ts`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const useExportAngularCode = () => {
  const exportAngularCode = async (schema: any): Promise<void> => {
    const { panelValue: code, panelName: fileName, errors } = await generateAngularCode({
      pageInfo: { schema },
      formatWithPrettier: true,
    });

    if (errors?.length) {
      console.error('生成代码校验出错：', errors);
    }

    downloadTextFile(fileName, code);
  };

  return {
    exportAngularCode,
  };
};
