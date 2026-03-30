// 一个极简的 A2A 风格 Agent Demo 服务
// 启动方式（在项目根目录）：
//   node sites/playground/server/a2a-demo-agent.js
//
// 主要能力（对齐 A2A 的核心概念做了简化实现）：
// - GET  /a2a/agent       返回 Agent Card（基本字段对齐 A2A Agent Card）
// - POST /a2a/tasks       创建一个 Task（本例中会立即完成）
// - GET  /a2a/tasks/:id   查询指定 Task 详情

import http from 'node:http';
import { parse as parseUrl } from 'node:url';

const PORT = process.env.A2A_AGENT_PORT ? Number(process.env.A2A_AGENT_PORT) : 3100;

// 一个简单的 Agent Card，字段参考 A2A 规范（简化版）
const agentCard = {
  name: 'demo-time-format-agent',
  description: '一个示例 A2A Agent，会返回当前时间的格式化结果（yyyy-MM-dd hh:mm:ss）。',
  version: '1.0.0',
  api: {
    type: 'a2a',
    // 这是 A2A API 的 base URL，前端 Agent 配置里的 api.url 需要指向这里
    url: `http://localhost:${PORT}/a2a`,
    version: '1',
  },
  auth: {
    type: 'none',
    instructions: '无需认证，直接调用即可。',
  },
  // 对象数组：id/name 作标题，description 在 Playground「添加 Agent」详情里单独展示（与 string[] 仅有标识不同）
  capabilities: [
    {
      id: 'time-format',
      name: '时间格式化',
      description:
        '根据服务端当前时间返回格式化字符串，格式为 yyyy-MM-dd HH:mm:ss；对应本 Demo 的 POST /a2a/tasks 行为。',
    }
  ],
  contact: {
    name: 'Demo Agent',
    url: 'http://localhost',
  },
};

// 简单的内存 Task 存储，模拟 A2A 的 Task 生命周期
const tasks = new Map();

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data, null, 2));
}

function notFound(res) {
  sendJson(res, 404, { error: 'Not Found' });
}

const server = http.createServer((req, res) => {
  const url = parseUrl(req.url || '', true);
  const method = req.method || 'GET';

  // CORS 方便浏览器直接调试
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // GET /a2a/agent -> Agent Card
  if (method === 'GET' && url.pathname === '/a2a/agent') {
    sendJson(res, 200, agentCard);
    return;
  }

  // POST /a2a/tasks -> 创建并立即完成一个任务（返回当前时间的格式化结果）
  if (method === 'POST' && url.pathname === '/a2a/tasks') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf-8');
    });
    req.on('end', () => {
      let payload;
      try {
        payload = body ? JSON.parse(body) : {};
      } catch (e) {
        sendJson(res, 400, { error: 'Invalid JSON body' });
        return;
      }

      const now = new Date();
      const pad = (n) => (n < 10 ? `0${n}` : String(n));
      const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
        now.getHours(),
      )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const isoNow = now.toISOString();
      const taskId = `task_${Date.now()}`;

      // 极简 Task 模型（对齐 A2A 的核心字段：taskId、status 等）
      const task = {
        taskId,
        status: 'completed',
        createdAt: isoNow,
        updatedAt: isoNow,
        // 这里把真正的业务结果放在 result 里
        result: {
          type: 'time-format',
          formatted,
          raw: isoNow,
          input: payload.input ?? null,
          metadata: payload.metadata ?? null,
          note: '这是 demo-time-format-agent 返回的当前时间格式化结果。',
        },
      };

      tasks.set(taskId, task);

      sendJson(res, 200, task);
    });
    return;
  }

  // GET /a2a/tasks/:id -> 查询 Task 详情
  if (method === 'GET' && url.pathname && url.pathname.startsWith('/a2a/tasks/')) {
    const taskId = url.pathname.replace('/a2a/tasks/', '');
    const task = tasks.get(taskId);

    if (!task) {
      sendJson(res, 404, { error: 'Task not found', taskId });
      return;
    }

    sendJson(res, 200, task);
    return;
  }

  notFound(res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[a2a-demo-agent] running at http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`[a2a-demo-agent] Agent Card: GET http://localhost:${PORT}/a2a/agent`);
  // eslint-disable-next-line no-console
  console.log(`[a2a-demo-agent] Task API:  POST http://localhost:${PORT}/a2a/tasks`);
  // eslint-disable-next-line no-console
  console.log(`[a2a-demo-agent] Get Task:   GET  http://localhost:${PORT}/a2a/tasks/{taskId}`);
});

