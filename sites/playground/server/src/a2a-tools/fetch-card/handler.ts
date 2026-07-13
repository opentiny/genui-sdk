import type { Request, Response as ExpressResponse } from 'express';
import getRawBody from 'raw-body';
import { normalizeAgentCard } from '../parse-card/index.js';
import { isAllowedAgentUrl, isPlaygroundDevelopment } from '../guard-agent-url/index.js';

const UPSTREAM_FETCH_TIMEOUT_MS = 10_000;

export const fetchAgentCardHandler = async (req: Request, res: ExpressResponse): Promise<void> => {
  try {
    const rawBody = await getRawBody(req, { encoding: 'utf-8', limit: '16kb' });
    const body = JSON.parse(rawBody);
    const requestedUrl = (body?.url || '').trim();

    if (!requestedUrl) {
      res.status(400).json({ message: '缺少 Agent Card URL' });
      return;
    }

    try {
      new URL(requestedUrl);
    } catch {
      res.status(400).json({ message: 'Agent Card URL 无效' });
      return;
    }

    if (!isPlaygroundDevelopment && !isAllowedAgentUrl(requestedUrl)) {
      res.status(403).json({ message: '不允许访问本地或内网地址' });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_FETCH_TIMEOUT_MS);

    let fetchRes: globalThis.Response;
    try {
      fetchRes = await fetch(requestedUrl, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        redirect: 'error',
      });
    } catch (error: any) {
      const message = error?.name === 'AbortError' ? '获取 Agent Card 超时' : error?.message || String(error);
      res.status(502).json({ message });
      return;
    } finally {
      clearTimeout(timeoutId);
    }

    const rawText = await fetchRes.text();

    if (!fetchRes.ok) {
      res.status(fetchRes.status >= 400 ? fetchRes.status : 502).json({
        message: rawText.trim() || `HTTP ${fetchRes.status} ${fetchRes.statusText}`.trim(),
      });
      return;
    }

    let card: unknown;
    try {
      card = rawText.trim() ? JSON.parse(rawText) : null;
    } catch {
      res.status(500).json({ message: 'Agent Card 响应不是有效 JSON' });
      return;
    }

    if (!card || typeof card !== 'object' || Array.isArray(card)) {
      res.status(500).json({ message: 'Agent Card 格式无效' });
      return;
    }

    const normalizedCard = normalizeAgentCard(card as Record<string, unknown>);
    res.status(200).json({ data: normalizedCard });
  } catch (error: any) {
    const message = error?.message || String(error);
    const httpStatus = error?.name === 'AgentCardProtocolError' ? 422 : 500;
    res.status(httpStatus).json({ message });
  }
};
