import cors from 'cors';
import express from 'express';
import { equipChatCompletions, type IEquipChatCompletionsOptions } from './equip-chat-completions';

export interface IStartServerOptions extends Omit<IEquipChatCompletionsOptions, 'route'> {
  port?: number;
  maxAttempts?: number;
}

/**
 * 尝试在指定端口启动服务器，如果端口被占用则尝试下一个端口
 * @param port 起始端口号
 * @param maxAttempts 最大尝试次数，默认10次
 */
export function startServer(options: IStartServerOptions): void {
  const { baseURL, apiKey, maxAttempts = 10, port = 3100 } = options;

  const app = express();
  app.use(cors());

  equipChatCompletions(app, {
    route: '/chat/completions',
    apiKey,
    baseURL,
  });

  let currentPort = port ?? 3100;
  let attempts = 0;
  let server: any = null;

  const tryListen = () => {
    if (attempts >= maxAttempts) {
      console.error(
        `Failed to start server: Unable to find an available port after ${maxAttempts} attempts (tried ports ${port} to ${
          currentPort - 1
        })`,
      );
      process.exit(1);
    }

    server = app.listen(currentPort, () => {
      console.info(`genui-sdk-server is running on http://localhost:${currentPort}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        attempts++;
        const nextPort = currentPort + 1;
        console.warn(`Port ${currentPort} is already in use, trying port ${nextPort}...`);
        currentPort = nextPort;
        // 关闭当前服务器实例（如果已创建），然后尝试下一个端口
        if (server) {
          server.close();
          server = null;
        }
        // 延迟一下再尝试，避免端口可能还在释放中
        setTimeout(tryListen, 100);
      } else {
        console.error('Failed to start server:', error);
        process.exit(1);
      }
    });
  };

  tryListen();
}
