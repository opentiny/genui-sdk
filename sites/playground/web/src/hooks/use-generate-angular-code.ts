import { AngularCodeGenerator } from '@opentiny/genui-sdk-angular/code-generator';
import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';
import { runCodeExport } from '../utils';

export const useGenerateAngularCode = () => {
  const exportAngularCode = (schema: string | object) =>
    runCodeExport(
      () =>
        new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({
          pageInfo: { schema: schema as never },
        }),
      'SchemaCard.component.ts',
    );

  return {
    exportAngularCode,
  };
};
