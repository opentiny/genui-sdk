import { AngularCodeGenerator } from '@opentiny/genui-angular-code-generator';
import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';

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
    const result = await new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({
      pageInfo: { schema: schema as never },
    });

    downloadTextFile(result.panelName || 'SchemaCard.component.ts', result.panelValue);
  };

  return {
    exportAngularCode,
  };
};
