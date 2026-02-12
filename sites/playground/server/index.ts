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

const initProviderModelMapper = async () => {
  try {
    const dynamicData = await fetchOpenTinyProviderModelsData();
    const staticData = await loadProviderModelsDataFromFile(process.env.providerModelsPath);
    const merged = mergeProviderModelsData(dynamicData, staticData);

    if (Object.keys(merged).length) {
      await initProviderModelMapperFromData(merged);
    }
  } catch (error) {
    console.error('Failed to initialize provider model mapper:', error);
  }
};

initProviderModelMapper();

const port = process.env.PORT || 3008;

app.listen(port);
console.info(`genui-sdk-playground-server is running on http://localhost:${port}`);
