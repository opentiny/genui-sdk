import type { UserItem } from '@opentiny/tiny-robot';
import { TinyNotify } from '@opentiny/vue';
import { ref, type Ref } from 'vue';
import { type FileMeta, processFiles, serializeFile } from '../file-upload/file-utils';
import type { ModelCapability } from './chat.types';
import { useI18n } from '../i18n';

const useFileUpload = () => {
  const { t } = useI18n();
  const attachments = ref<FileMeta[]>([]);
  const templateData = ref<UserItem[]>([]);

  /**
   * 处理附件并生成消息内容
   * @returns 处理结果，如果失败返回 null
   */
  const processAttachments = async (
    attachments: FileMeta[],
    features: ModelCapability,
  ): Promise<{
    apiContent: any[];
  } | null> => {
    let apiContent: any[] = [];
    if (attachments.length === 0) {
      return { apiContent };
    }

    try {
      // 提取原始文件
      apiContent = await processFiles(attachments, features);

      return {
        apiContent,
      };
    } catch (error) {
      TinyNotify({
        type: 'error',
        title: t('fileUpload.error.processFailed'),
        message: error instanceof Error ? error.message : t('fileUpload.error.unknownError'),
        position: 'top-right',
      });
      // 不再抛出错误，返回 null 表示处理失败
      return null;
    }
  };
  const clearAttachments = () => {
    attachments.value = [];
  };
  const handleFilesSelected = async (files: File[], inputMessage: string) => {
    if (!files || files.length === 0) {
      return;
    }
    if (!templateData.value.length) {
      templateData.value.unshift({
        type: 'text',
        content: inputMessage,
      });
    }

    for (const file of files) {
      templateData.value.push({
        type: 'template',
        content: file.name || '',
      });
      try {
        // 如果附件列表中已经存在相同的文件，则不添加
        if (attachments.value.find((fileMeta) => fileMeta.name === file.name)) {
          continue;
        }
        const fileMeta = await serializeFile(file);
        // 添加到附件列表
        attachments.value.push(fileMeta);
      } catch (error) {
        TinyNotify({
          type: 'error',
          title: t('fileUpload.error.validationFailed'),
          message: error instanceof Error ? error.message : t('fileUpload.error.unknownError'),
          position: 'top-right',
        });
      }
    }
  };
  /**
   * 处理 template 编辑：保持 templateData 和 attachments 同步
   * 删除在 attachments 中找不到对应附件的 template，以及删除没有被任何 template 引用的 attachment
   * @param templateData 当前的 templateData
   * @returns 更新后的 templateData
   */
  const handleTemplateEdit = (templateData: Ref<UserItem[]>, inputMessage: string): UserItem[] => {
    const newValue = templateData.value;

    // 收集 attachments 中所有的文件名
    const attachmentFileNames = new Set<string>(
      attachments.value.map((fileMeta) => fileMeta.name).filter((name): name is string => !!name),
    );

    // 过滤掉那些 content 在 attachments 中找不到的 template
    const updatedTemplateData = newValue.filter((item) => {
      if (item.type === 'template') {
        // 如果 template 的 content 在 attachments 中找不到，删除这个 template
        const content = (item as any).content;
        return content && attachmentFileNames.has(content);
      }
      return true;
    });

    // 收集更新后 templateData 中所有的 template 文件名
    const templateFileNames = new Set<string>(
      updatedTemplateData
        .filter((item) => item.type === 'template' && (item as any).content)
        .map((item) => (item as any).content as string),
    );

    // 删除那些没有被任何 template 引用的 attachment
    // 从后往前删除，避免索引变化导致的问题
    for (let i = attachments.value.length - 1; i >= 0; i--) {
      const attachment = attachments.value[i];
      const fileName = attachment.name;
      if (fileName && !templateFileNames.has(fileName)) {
        attachments.value.splice(i, 1);
      }
    }

    return updatedTemplateData;
  };

  return {
    attachments,
    templateData,
    processAttachments,
    clearAttachments,
    handleFilesSelected,
    handleTemplateEdit,
  };
};

export { useFileUpload };
