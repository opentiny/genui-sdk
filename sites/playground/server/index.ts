import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import { useProviderModelMapperSync, initProviderModelMapperFromData } from './src/use-provider-mapper.js';
import { loadProviderModelsDataFromFile, mergeProviderModelsData } from './src/provider-models-mapper.js';
import { fetchOpenTinyProviderModelsData } from './src/opentiny-models.js';
import { createChatGenui, checkMcpHandler } from './src/chat-genui.js';
import { createChatTemplate } from './src/chat-template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = minimist(process.argv.slice(2));
const { mode } = args;
const envFileName = mode ? `.env.${mode}` : '.env';
const envPath = path.resolve(__dirname, envFileName);
dotenv.config({ path: envPath });
dotenv.config();
const { chatGenuiHandler } = createChatGenui();
const { chatTemplateHandler } = createChatTemplate();

const app = express();

app.use(cors());

const providerModelsEnvPath = process.env.providerModelsPath;

// 静态模型列表：仅在首次刷新时读取一次，后续请求直接复用
let staticProviderModelsData: Record<string, any> | null = null;
let staticProviderModelsLoaded = false;

// 刷新中的 Promise，并发请求复用同一轮刷新
let modelsUpdatingPromise: Promise<void> | null = null;

const loadStaticProviderModels = async () => {
  if (!providerModelsEnvPath || staticProviderModelsLoaded) {
    return;
  }

  const staticFullPath = path.resolve(__dirname, providerModelsEnvPath);
  staticProviderModelsData = await loadProviderModelsDataFromFile(staticFullPath);

  if (!staticProviderModelsData) {
    console.warn('Static provider models file not found or invalid:', staticFullPath);
  }

  staticProviderModelsLoaded = true;
};

/**
 * 刷新模型列表：拉取动态列表 + 与静态列表合并，更新 ProviderModelMapper。
 * 并发请求会复用同一轮刷新 Promise。
 */
const updateProviderModels = async () => {
  if (modelsUpdatingPromise) {
    return modelsUpdatingPromise;
  }

  modelsUpdatingPromise = (async () => {
    try {
      if (!staticProviderModelsLoaded) {
        await loadStaticProviderModels();
      }

      const dynamicProviderModelsData = await fetchOpenTinyProviderModelsData();

      const mergedProviderModelsData = mergeProviderModelsData(
        dynamicProviderModelsData || {},
        staticProviderModelsData || {},
      );

      if (Object.keys(mergedProviderModelsData).length) {
        await initProviderModelMapperFromData(mergedProviderModelsData);
      }
    } catch (error) {
      console.error('Failed to refresh provider models:', error);
    } finally {
      modelsUpdatingPromise = null;
    }
  })();

  return modelsUpdatingPromise;
};

const getModelsHandler = async (req: Request, res: Response) => {
  try {
    await updateProviderModels();
    const providerModelMapper = useProviderModelMapperSync();
    const models = providerModelMapper.getAllModelInfos();
    res.send(models);
  } catch (error) {
    console.error('Failed to get models:', error);
    res.status(500).send({ error: 'Failed to get models' });
  }
};

app.get('/get-models', getModelsHandler);
app.post('/chat-genui', chatGenuiHandler);
app.post('/check-mcp', checkMcpHandler);
app.post('/chat-template', chatTemplateHandler);

const port = process.env.PORT || 3008;

// 启动时先做一次刷新，避免在首次请求前 mapper 为空
updateProviderModels().finally(() => {
  app.listen(port);
  console.info(`genui-sdk-playground-server is running on http://localhost:${port}`);
});
