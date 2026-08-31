import './style.css';
import { generateCode } from '../../code-generator/index';
import { DEMO_SCHEMA } from './demo-schema';

const $ = <T extends HTMLElement>(sel: string): T => {
  const el = document.querySelector<T>(sel);
  if (!el) throw new Error(`Element not found: ${sel}`);
  return el;
};

const schemaInput = $<HTMLTextAreaElement>('#schema-input');
const runBtn = $<HTMLButtonElement>('#run-btn');
const loadBtn = $<HTMLButtonElement>('#load-demo-btn');
const clearBtn = $<HTMLButtonElement>('#clear-btn');
const copyBtn = $<HTMLButtonElement>('#copy-btn');
const resultPre = $<HTMLPreElement>('#result-code');
const statusEl = $<HTMLDivElement>('#status');
const errorsEl = $<HTMLPreElement>('#errors');

let currentCode = '';

async function runGenerate() {
  const raw = schemaInput.value.trim();
  if (!raw) {
    setStatus('请先粘贴 schema JSON', true);
    return;
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    setStatus('schema 不是合法 JSON', true);
    return;
  }

  runBtn.disabled = true;
  runBtn.textContent = '出码中…';
  setStatus('');
  errorsEl.textContent = '';

  try {
    const result = await generateCode({
      pageInfo: { schema: json as never, name: 'SchemaCard' },
    });
    currentCode = result.panelValue ?? '';
    resultPre.textContent = currentCode || '（生成结果为空）';
    setStatus(result.panelName ? `生成成功：${result.panelName}` : '生成成功');

    const errors = result.errors ?? [];
    if (errors.length) {
      errorsEl.textContent = errors.map((e) => `• ${e.message}`).join('\n');
    }
  } catch (e) {
    setStatus(`出码失败：${e instanceof Error ? e.message : String(e)}`, true);
    resultPre.textContent = '';
    currentCode = '';
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '执行出码';
  }
}

function setStatus(text: string, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

async function copyResult() {
  if (!currentCode) return;
  try {
    await navigator.clipboard.writeText(currentCode);
    copyBtn.textContent = '已复制 ✓';
  } catch {
    copyBtn.textContent = '复制失败';
  }
  setTimeout(() => {
    copyBtn.textContent = '复制';
  }, 1500);
}

loadBtn.addEventListener('click', () => {
  schemaInput.value = JSON.stringify(DEMO_SCHEMA, null, 2);
  setStatus('');
  errorsEl.textContent = '';
});

clearBtn.addEventListener('click', () => {
  schemaInput.value = '';
  resultPre.textContent = '暂无结果';
  currentCode = '';
  setStatus('');
  errorsEl.textContent = '';
});

copyBtn.addEventListener('click', copyResult);
runBtn.addEventListener('click', runGenerate);
schemaInput.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    runGenerate();
  }
});

// 初始载入示例，方便直接测试
loadBtn.click();
