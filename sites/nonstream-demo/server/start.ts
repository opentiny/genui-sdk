// 就按文档里那段最小示例写（startServer 的编程方式启动）。
// BASE_URL / API_KEY 由 dev:server 脚本的 --env-file=server/.env 注入。
import { startServer } from '@opentiny/genui-sdk-server';

startServer({
  port: 3100,
  baseURL: process.env.BASE_URL || '',
  apiKey: process.env.API_KEY || '',
});
