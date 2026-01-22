import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import { useProviderModelMapper, useProviderModelMapperSync } from './src/use-provider-mapper.js';
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

useProviderModelMapper(path.resolve(__dirname, process.env.providerModelsPath || ''));
const getModelsHandler = async (req: Request, res: Response) => {
  console.log('Received request to /get-models');
  const providerModelMapper = useProviderModelMapperSync();
  const models = providerModelMapper.getAllModelInfos();

  res.send(models);
};
const app = express();

app.use(cors());

app.get('/get-models', getModelsHandler);
app.post('/chat-genui', chatGenuiHandler);
app.post('/check-mcp', checkMcpHandler);

const port = process.env.PORT || 3008;
app.listen(port);
console.info(`ai-console-server is running on http://localhost:${port}`);
