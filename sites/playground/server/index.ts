import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import {
  useProviderModelMapper,
  useProviderModelMapperSync,
  initProviderModelMapperFromData,
} from './src/use-provider-mapper.js';
import { fetchOpenTinyProviderModelsData } from './src/opentiny-models.js';
import { createChatGenui, checkMcpHandler } from './src/chat-genui.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = minimist(process.argv.slice(2));
const { mode } = args;
const envFileName = mode ? `.env.${mode}` : '.env';
const envPath = path.resolve(__dirname, envFileName);
dotenv.config({ path: envPath });
dotenv.config();
const { chatGenuiHandler } = createChatGenui();

const app = express();

app.use(cors());

// 统一从 ProviderModelMapper 读取模型列表
const getModelsHandler = (req: Request, res: Response) => {
  try {
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

const port = process.env.PORT || 3008;

const providerModelsPath = path.resolve(__dirname, process.env.providerModelsPath || 'alpha-models.json');

try {
  if (mode === 'alpha') {
    // alpha：从本地 JSON 初始化 mapper
    await useProviderModelMapper(providerModelsPath);
  } else {
    try {
      // 非 alpha：从 OpenTiny 接口拉取模型，转为 provider-models 结构并初始化 mapper
      const providerModelsData = await fetchOpenTinyProviderModelsData();
      await initProviderModelMapperFromData(providerModelsData);
    } catch (fetchError) {
      // 拉取失败时降级为从 process.env.providerModelsPath 指定路径加载
      console.warn('OpenTiny models fetch failed, fallback to process.env.providerModelsPath:', fetchError);
      await useProviderModelMapper(providerModelsPath);
    }
  }

  app.listen(port);
  console.info(`genui-sdk-playground-server is running on http://localhost:${port}`);
} catch (error) {
  console.error('Failed to initialize provider model mapper:', error);
  process.exit(1);
}
