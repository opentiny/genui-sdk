import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import type { LlmBenchmarkRunOptions } from '../framework/index';
import { generateSamples } from '../generate-samples';
import { runReport } from '../run-report';
import {
  applyFormPayload,
  resolveRunOptions,
  toFormDefaults,
  type BenchUiFormPayload,
} from '../resolve-run-options';
import { basicLlmBenchmarkSampleCases } from '../samples/basic';
import { complexLlmBenchmarkSampleCases } from '../samples/complex';
import { constraintLlmBenchmarkSampleCases } from '../samples/constraints';
import { contextualA2uiLlmBenchmarkSampleCases } from '../samples/contextual-a2ui';
import { contextualGenuiLlmBenchmarkSampleCases } from '../samples/contextual-genui';
import { edgeLlmBenchmarkSampleCases } from '../samples/edge';
import { listMaasManifestModelNames, resolveMaasModelsJsonPath, resolveSamplesDir } from '../utils';
import { protocolFromOptions } from '../protocol';

const uiDir = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(uiDir, 'public');
const benchmarksPackageDir = path.resolve(uiDir, '..', '..');

type RunState = 'idle' | 'running' | 'done' | 'error';

type LogListener = (line: string) => void;

type ArtifactLinks = {
  runDir: string | null;
  /** 结论页：runReport 写出的 report.html（insights 同款布局） */
  conclusions: string | null;
};

type BenchUiMeta = {
  defaults: BenchUiFormPayload;
  models: string[];
  /** 当前模型清单路径（相对 benchmarks 包根，否则绝对路径） */
  modelsManifestPath?: string;
  scenarioGroups: Array<{ group: string; label: string; scenarios: string[] }>;
  /** 按协议的场景分组（UI 切换 protocol 时换 contextual 标签与列表） */
  scenarioGroupsByProtocol: {
    genui: Array<{ group: string; label: string; scenarios: string[] }>;
    a2ui: Array<{ group: string; label: string; scenarios: string[] }>;
  };
  existingRunDirs: string[];
  port: number;
};

function scenarioGroups(protocol: 'genui' | 'a2ui' = 'genui') {
  const contextual =
    protocol === 'a2ui' ? contextualA2uiLlmBenchmarkSampleCases : contextualGenuiLlmBenchmarkSampleCases;
  return [
    { group: 'basic', label: '基础', scenarios: basicLlmBenchmarkSampleCases.map((c) => c.id) },
    { group: 'complex', label: '复杂', scenarios: complexLlmBenchmarkSampleCases.map((c) => c.id) },
    { group: 'edge', label: '边界', scenarios: edgeLlmBenchmarkSampleCases.map((c) => c.id) },
    {
      group: 'constraints',
      label: '约束',
      scenarios: constraintLlmBenchmarkSampleCases.map((c) => c.id),
    },
    {
      group: 'contextual',
      label: protocol === 'a2ui' ? '上下文 (a2ui)' : '上下文 (genui)',
      scenarios: contextual.map((c) => c.id),
    },
  ];
}

function listExistingRunDirs(): string[] {
  const root = resolveSamplesDir();
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}-\d{2}-\d{2}_/.test(d.name))
    .map((d) => d.name)
    .sort()
    .reverse()
    .slice(0, 40);
}

function openBrowser(url: string) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn(`[bench-ui] Could not open browser automatically. Open: ${url}`);
  });
}

function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryListen = (port: number, attemptsLeft: number) => {
      const probe = http.createServer();
      probe.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          tryListen(port + 1, attemptsLeft - 1);
        } else {
          reject(err);
        }
      });
      probe.once('listening', () => {
        probe.close(() => resolve(port));
      });
      probe.listen(port, '127.0.0.1');
    };
    tryListen(preferred, 20);
  });
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function serveStatic(res: http.ServerResponse, filePath: string) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const type =
    ext === '.html'
      ? 'text/html; charset=utf-8'
      : ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
          ? 'text/javascript; charset=utf-8'
          : ext === '.json'
            ? 'application/json; charset=utf-8'
            : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
}

function buildArtifactLinks(samplesDir: string | undefined): ArtifactLinks {
  if (!samplesDir) {
    return { runDir: null, conclusions: null };
  }
  return {
    runDir: path.basename(samplesDir),
    conclusions: fs.existsSync(path.join(samplesDir, 'report.html')) ? '/artifacts/report.html' : null,
  };
}

/**
 * 启动配置页 UI：打开浏览器，表单提交后执行 generate + report。
 * 进程保持存活以便多次跑测与查看日志。
 */
export async function startBenchUi(preferredPort = 3847): Promise<void> {
  const port = await findFreePort(preferredPort);
  const logListeners = new Set<LogListener>();
  let runState: RunState = 'idle';
  let lastError: string | undefined;
  let lastSamplesDir: string | undefined;
  let runPromise: Promise<void> | null = null;

  const original = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  const broadcast = (level: string, args: unknown[]) => {
    const line = `[${level}] ${args
      .map((a) => {
        if (typeof a === 'string') return a;
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ')}`;
    for (const listener of logListeners) {
      try {
        listener(line);
      } catch {
        /* ignore broken SSE client */
      }
    }
  };

  const installConsoleTee = () => {
    console.log = (...args: unknown[]) => {
      original.log(...args);
      broadcast('log', args);
    };
    console.warn = (...args: unknown[]) => {
      original.warn(...args);
      broadcast('warn', args);
    };
    console.error = (...args: unknown[]) => {
      original.error(...args);
      broadcast('error', args);
    };
  };

  const buildMeta = (): BenchUiMeta => {
    let models: string[] = [];
    let modelsManifestPath: string | undefined;
    try {
      const abs = resolveMaasModelsJsonPath();
      const rel = path.relative(benchmarksPackageDir, abs);
      modelsManifestPath = !rel.startsWith('..') && !path.isAbsolute(rel)
        ? rel.split(path.sep).join('/')
        : abs;
      models = listMaasManifestModelNames();
    } catch (err) {
      console.warn('[bench-ui] Failed to load model list:', err instanceof Error ? err.message : err);
    }
    const defaults = toFormDefaults(resolveRunOptions());
    const protocol = protocolFromOptions({ protocol: defaults.protocol });
    return {
      defaults,
      models,
      modelsManifestPath,
      scenarioGroups: scenarioGroups(protocol),
      scenarioGroupsByProtocol: {
        genui: scenarioGroups('genui'),
        a2ui: scenarioGroups('a2ui'),
      },
      existingRunDirs: listExistingRunDirs(),
      port,
    };
  };

  const runBenchmark = async (form: BenchUiFormPayload) => {
    if (runState === 'running') {
      throw new Error('A benchmark run is already in progress');
    }
    runState = 'running';
    lastError = undefined;
    lastSamplesDir = undefined;
    broadcast('log', ['[bench-ui] Starting benchmark with form configuration…']);

    const benchmarkStartedAtMs = Date.now();
    const options: LlmBenchmarkRunOptions = applyFormPayload(resolveRunOptions(), form);

    try {
      const gen = await generateSamples(options);
      lastSamplesDir = gen.samplesDir;
      await runReport({
        ...options,
        benchmarkStartedAtMs,
        samplesDir: gen.samplesDir,
        runMetadata: gen.runMetadata,
      });
      runState = 'done';
      const links = buildArtifactLinks(gen.samplesDir);
      broadcast('log', [
        `[bench-ui] Done. Samples/report: ${gen.samplesDir}` +
          (links.conclusions ? ' — open 查看结论 in the status bar.' : ''),
      ]);
    } catch (err) {
      runState = 'error';
      lastError = err instanceof Error ? err.message : String(err);
      broadcast('error', [`[bench-ui] Failed: ${lastError}`]);
      throw err;
    }
  };

  installConsoleTee();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    const { pathname } = url;

    try {
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
        serveStatic(res, path.join(publicDir, 'index.html'));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/meta') {
        sendJson(res, 200, buildMeta());
        return;
      }

      if (req.method === 'GET' && pathname === '/api/status') {
        sendJson(res, 200, {
          state: runState,
          lastError,
          lastSamplesDir,
          links: buildArtifactLinks(lastSamplesDir),
        });
        return;
      }

      if (req.method === 'GET' && pathname.startsWith('/artifacts/')) {
        if (!lastSamplesDir) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('No completed run yet');
          return;
        }
        const rel = decodeURIComponent(pathname.slice('/artifacts/'.length));
        if (!rel || rel.includes('\0') || path.isAbsolute(rel) || rel.split(/[/\\]/).includes('..')) {
          res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Bad path');
          return;
        }
        const root = path.resolve(lastSamplesDir);
        const filePath = path.resolve(root, rel);
        const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
        if (filePath !== root && !filePath.startsWith(rootPrefix)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Forbidden');
          return;
        }
        serveStatic(res, filePath);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/logs') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        res.write(`data: ${JSON.stringify({ type: 'hello', state: runState })}\n\n`);
        const listener: LogListener = (line) => {
          res.write(`data: ${JSON.stringify({ type: 'log', line })}\n\n`);
        };
        logListeners.add(listener);
        const heartbeat = setInterval(() => {
          res.write(`: ping\n\n`);
        }, 15000);
        req.on('close', () => {
          clearInterval(heartbeat);
          logListeners.delete(listener);
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/run') {
        if (runState === 'running') {
          sendJson(res, 409, { ok: false, error: 'Benchmark already running' });
          return;
        }
        const raw = await readBody(req);
        let form: BenchUiFormPayload;
        try {
          form = JSON.parse(raw || '{}') as BenchUiFormPayload;
        } catch {
          sendJson(res, 400, { ok: false, error: 'Invalid JSON body' });
          return;
        }
        sendJson(res, 202, { ok: true, message: 'Benchmark started' });
        runPromise = runBenchmark(form).catch(() => {
          /* error already logged / state set */
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/shutdown') {
        sendJson(res, 200, { ok: true });
        setTimeout(() => {
          server.close();
          process.exit(runState === 'error' ? 1 : 0);
        }, 200);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      sendJson(res, 500, { ok: false, error: detail });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(port, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const url = `http://127.0.0.1:${port}/`;
  console.log(`[bench-ui] Config UI listening at ${url}`);
  console.log('[bench-ui] Submit the form to run generateSamples → runReport. Use --cli to skip UI.');
  openBrowser(url);

  // Keep process alive; wait forever (or until shutdown).
  await new Promise<void>(() => {
    /* intentionally never resolves; exit via /api/shutdown or Ctrl+C */
  });

  void runPromise;
}
