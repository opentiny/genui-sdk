/**
 * 读取环境变量字符串值；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 环境变量值或回退值
 */
export function envString(key: string, fallback: string | undefined): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v;
}

/**
 * 读取环境变量布尔值；空字符串视为未设置。
 * 接受：`1/true/yes` 视为 `true`。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 解析后的布尔值
 */
export function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v === '1' || v === 'true' || v.toLowerCase() === 'yes';
}

/**
 * 读取环境变量列表（逗号分隔）；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 解析后的字符串列表
 */
export function envStringList(key: string, fallback?: string[]): string[] | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const list = v
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

/**
 * 读取环境变量正整数；空字符串视为未设置；小于 1 视为无效。
 * @param key 环境变量名
 * @param fallback 未设置/无效时的回退值
 * @returns 解析后的正整数
 */
export function envPositiveInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const parsed = Number.parseInt(v, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

/**
 * 读取框架选择（Vue/Angular）。
 * @param key 环境变量名
 * @param fallback 默认框架
 * @returns 解析后的框架
 */
export function envFramework(key: string, fallback: 'Vue' | 'Angular' | undefined): 'Vue' | 'Angular' {
  const v = process.env[key];
  if (v === 'Angular' || v === 'Vue') {
    return v;
  }
  if (fallback === 'Angular' || fallback === 'Vue') {
    return fallback;
  }
  return 'Vue';
}
