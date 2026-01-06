import type { ModelCapability } from '../chat.types';

export type FileCategory = 'image' | 'document';

/**
 * MIME 类型映射表
 * 将文件扩展名映射到对应的 MIME 类型
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  // 图片格式
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  heic: 'image/heic',
  tiff: 'image/tiff',
  // 文档格式
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
} as const;

/**
 * 图片 MIME 类型列表
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/heic',
  'image/tiff',
] as const;

/**
 * 验证文件大小
 * @param file 文件对象
 * @param maxSizeMB 最大文件大小（MB）
 * @throws 如果文件超过大小限制
 */
import { useI18n } from '../i18n';

export function validateFileSize(file: FileMeta, maxSizeMB: number): void {
  const { t } = useI18n();
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(t('fileUpload.error.fileSizeExceeded', {
      maxSizeMB,
      currentSizeMB: (file.size / 1024 / 1024).toFixed(2),
    }));
  }
}

/**
 * 验证文件是否符合模型要求
 * @param features 模型能力配置
 * @param file 文件对象
 * @returns 验证结果
 */
export function validateFileForModel(file: FileMeta, features: ModelCapability): { valid: boolean; error?: string } {
  const { t } = useI18n();
  
  if (!features) {
    return { valid: false, error: t('fileUpload.error.unsupportedModel') };
  }

  // 检查文件扩展名
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!features.supportImage?.supportedFileTypes.includes(extension)) {
    return {
      valid: false,
      error: t('fileUpload.error.unsupportedFormat', { extension }),
    };
  }

  // 检查文件大小
  const maxSize = features.supportImage?.maxImageSize || 0;
  const maxBytes = maxSize * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: t('fileUpload.error.sizeLimitExceeded', { maxSize }),
    };
  }

  return { valid: true };
}
/**
 * 检测文件类别（基于 MIME 类型）
 * @param file 文件对象
 * @returns 文件类别（image 或 document）
 */
export function detectFileCategory(type: string): FileCategory {
  return IMAGE_MIME_TYPES.includes(type as any) ? 'image' : 'document';
}

export const processFiles = async (files: FileMeta[], features: ModelCapability): Promise<any> => {
  const { t } = useI18n();
  
  // 获取模型能力配置
  if (!features) {
    throw new Error(t('fileUpload.error.unsupportedModel'));
  }

  // 检查文件数量限制
  if (features.supportImage?.maxFilesPerRequest && files.length > features.supportImage.maxFilesPerRequest) {
    throw new Error(t('fileUpload.error.maxFilesExceeded', { maxFiles: features.supportImage.maxFilesPerRequest }));
  }

  // 统一处理（单个或多个）
  const results = await Promise.all(files.map((file) => processFile(file, features)));

  // 合并结果
  return results;
};
/**
 * 处理单个文件
 */
const processFile = async (file: FileMeta, features: ModelCapability): Promise<any> => {
  const { t } = useI18n();
  const fileCategory = detectFileCategory(file.type);

  // 验证文件格式和大小
  const validation = validateFileForModel(file, features);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const maxSize = features.supportImage?.maxImageSize || 0;
  validateFileSize(file, maxSize);

  // ai-sdk格式要求
  if (fileCategory === 'image') {
    return {
      type: 'image',
      image: file.base64,
      filename: file.name,
    };
  }

  if (fileCategory === 'document') {
    return {
      type: 'file',
      mediaType: file.type,
      data: file.base64,
      filename: file.name,
    };
  }

  throw new Error(t('fileUpload.error.unsupportedFileType', { fileCategory }));
};

export interface FileMeta {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  base64: string;
}

/**
 * 浏览器环境：File 序列化（转为 JSON 字符串，含 Base64 数据 + 元数据）
 * @param {File} file - 要序列化的 File 对象
 * @returns {Promise<string>} 序列化后的 JSON 字符串
 */
export const serializeFile = (file: File): Promise<FileMeta> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // 读取 File 为 Base64 字符串
    reader.readAsDataURL(file);

    reader.onload = () => {
      // 提取元数据（文件名、MIME 类型、大小、最后修改时间）
      const fileMeta = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
        base64: reader.result,
      };
      resolve(fileMeta as FileMeta);
    };

    reader.onerror = (err) => reject(err);
  });
};

/**
 * 浏览器环境：反序列化 JSON 字符串 → File 对象
 * @param {FileMeta} fileMeta - 文件元数据
 * @returns {File} 原始 File 对象
 */
export const deserializeFile = (fileMeta: FileMeta): File => {
  const base64WithoutPrefix = fileMeta.base64.split(',')[1];
  const uint8Array = Uint8Array.from(atob(base64WithoutPrefix), (c) => c.charCodeAt(0));
  const blob = new Blob([uint8Array], { type: fileMeta.type });

  // 用元数据构造 File 对象（File 构造器：Blob + 文件名 + 可选元数据）
  return new File([blob], fileMeta.name, {
    type: fileMeta.type,
    lastModified: fileMeta.lastModified,
  });
};
