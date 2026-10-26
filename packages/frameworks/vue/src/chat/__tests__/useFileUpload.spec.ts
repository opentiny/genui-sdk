import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@opentiny/vue', () => ({
  TinyNotify: vi.fn(),
}));

vi.mock('../file-upload/file-utils', async () => {
  const actual = await vi.importActual<typeof import('../file-upload/file-utils')>('../file-upload/file-utils');
  return {
    ...actual,
    serializeFile: vi.fn(async (file: File) => ({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      base64: 'data:image/png;base64,AAAA',
    })),
  };
});

import { useFileUpload } from '../useFileUpload';

describe('useFileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates block template items for selected files, including attachment-only input', async () => {
    const { templateData, attachments, handleFilesSelected } = useFileUpload();
    const file = new File(['png'], 'photo.png', { type: 'image/png' });

    await handleFilesSelected([file], '');

    expect(templateData.value).toEqual([
      { type: 'text', content: '' },
      { type: 'block', content: 'photo.png' },
    ]);
    expect(attachments.value).toEqual([
      expect.objectContaining({ name: 'photo.png', type: 'image/png' }),
    ]);
  });
});
