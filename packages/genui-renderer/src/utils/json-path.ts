type JSONValue = any;
export interface IJSONObject {
  [key: string]: JSONValue;
}
export interface IChildSelector {
  type: 'child';
}

export interface ISelectorToken {
  type: 'selector';
  value: string;
}

export type IToken = IChildSelector | ISelectorToken;

/**
 * 判断 JSON 中某个 path 对应的节点是否匹配 selector
 */
export function matchJsonPath(json: IJSONObject, selector: string, path: string): boolean {
  const nodeChain = getNodeChain(json, path);
  if (!nodeChain.length) {
    return false;
  }

  const tokens = tokenizeSelector(selector);
  return matchChainWithSelector(nodeChain, tokens);
}

function tokenizeSelector(selector: string): IToken[] {
  const rawParts = selector.trim().split(/\s+/);
  const tokens: IToken[] = [];

  for (const part of rawParts) {
    if (part === '>') {
      tokens.push({ type: 'child' });
    } else {
      tokens.push({ type: 'selector', value: part });
    }
  }

  return tokens;
}

function getNodeChain(json: IJSONObject, path: string): { parent: JSONValue; key: string }[] {
  const parts = path.split('.');
  const chain: { parent: JSONValue; key: string }[] = [];

  let parent: JSONValue = null;
  let current: JSONValue = json;
  for (const key of parts) {
    parent = current;
    chain.push({ parent, key });
    if (parent && typeof parent === 'object') {
      current = parent[key];
    } else {
      current = undefined;
    }
  }

  return chain;
}

function matchChainWithSelector(nodeChain: { parent: JSONValue; key: string }[], tokens: IToken[]): boolean {
  let chainIndex = nodeChain.length - 1;
  let tokenIndex = tokens.length - 1;

  if (tokens[tokenIndex]?.type !== 'selector') {
    return false;
  }
  if (
    !matchPart(nodeChain[chainIndex].parent, nodeChain[chainIndex].key, (tokens[tokenIndex] as ISelectorToken).value)
  ) {
    return false;
  }
  tokenIndex--;
  chainIndex--;

  while (tokenIndex >= 0) {
    const token = tokens[tokenIndex];

    if (token.type === 'child') {
      tokenIndex--;
      if (
        tokens[tokenIndex].type === 'selector' &&
        !matchPart(
          nodeChain[chainIndex].parent,
          nodeChain[chainIndex].key,
          (tokens[tokenIndex] as ISelectorToken).value,
        )
      ) {
        return false;
      }
      tokenIndex--;
    } else if (token.type === 'selector') {
      let matched = false;
      while (chainIndex >= 0) {
        if (matchPart(nodeChain[chainIndex].parent, nodeChain[chainIndex].key, token.value)) {
          matched = true;
          break;
        }
        chainIndex--;
      }
      if (!matched) {
        return false;
      }
      tokenIndex--;
    }
  }

  return true;
}

/**
 * 匹配单个 selector 片段
 */
function matchPart(parent: JSONValue, key: string, selectorToken: string): boolean {
  if (!parent || typeof parent !== 'object') {
    return false;
  }

  if (!/\[.+\]/.test(selectorToken) && key !== selectorToken) {
    return false;
  }

  // 匹配属性选择器
  const attrMatches = [...selectorToken.matchAll(/\[([^\]=~^$*]+)(=|\^=|\$=|\*=)([^\]]+)\]/g)];
  if (attrMatches.length > 0) {
    for (const [, key, op, val] of attrMatches) {
      const nodeVal = String(parent[key] ?? '');
      if (op === '=' && nodeVal !== val) {
        return false;
      }
      if (op === '^=' && !nodeVal.startsWith(val)) {
        return false;
      }
      if (op === '$=' && !nodeVal.endsWith(val)) {
        return false;
      }
      if (op === '*=' && !nodeVal.includes(val)) {
        return false;
      }
    }
  }

  const leftover = selectorToken.replace(/\[[^\]]+\]/g, '').trim();
  if (leftover) {
    if (typeof parent === 'object' && parent !== null) {
      if (!Object.prototype.hasOwnProperty.call(parent, leftover)) return false;
    }
    // 基本类型或 null 节点不检查字段名，直接算匹配
  }

  return true;
}
