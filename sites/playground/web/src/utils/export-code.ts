export type ExportResult = { success: boolean; error?: string };

type IGeneratedCode = {
  panelName?: string;
  panelValue: string;
  errors?: { message: string }[];
};

export const downloadTextFile = (filename: string, text: string): void => {
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

export const runCodeExport = async (
  generate: () => Promise<IGeneratedCode>,
  fallbackName: string,
  ext = '',
): Promise<ExportResult> => {
  try {
    const { panelName, panelValue, errors } = await generate();

    if (errors?.length) {
      console.error('生成代码校验出错：', errors);
    }

    const name = panelName || fallbackName;
    downloadTextFile(ext && !name.toLowerCase().endsWith(ext) ? `${name}${ext}` : name, panelValue);

    return {
      success: !errors?.length,
      error: errors?.length ? errors.map((item) => item.message).join('；') : undefined,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};
