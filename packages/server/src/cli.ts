#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import { Command } from 'commander';
import { startServer } from './start-server';

const program = new Command();

program
  .name('genui-sdk-server')
  .description('Start a chat completion HTTP service for GenUI')
  .option('-e, --envFile <path>', '自定义环境变量文件路径（默认读取当前目录下的 .env）')
  .option('-p --port <port>', '服务启动端口（默认 3100，或者使用环境变量 PORT）')
  .helpOption('-h, --help', '查看命令帮助信息')
  .action((options: { envFile?: string; port?: string }) => {
    const { envFile, port } = options;

    if (envFile) {
      // 路径相对于命令执行时的当前工作目录
      const envFilePath = path.resolve(process.cwd(), envFile);
      dotenv.config({ path: envFilePath });
    } else {
      dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    }

    const baseURL = process.env.BASE_URL;
    const apiKey = process.env.API_KEY;

    if (!baseURL) {
      console.error('环境变量未配置：请在 .env 或系统环境中设置 BASE_URL');
      process.exit(1);
    }

    if (!apiKey) {
      console.error('环境变量未配置：请在 .env 或系统环境中设置 API_KEY');
      process.exit(1);
    }

    const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
    const startPort = (port ? Number(port) : undefined) ?? envPort ?? 3100;

    startServer({
      port: startPort,
      baseURL,
      apiKey,
      maxAttempts: 10,
    });
  });

program.parse(process.argv);
