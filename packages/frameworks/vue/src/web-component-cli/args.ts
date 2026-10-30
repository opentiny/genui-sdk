import path from 'node:path';
import { GENUI_CONFIG_RENDERER_TAG } from '../web-component/register';

export const DEFAULT_TAG_NAME = GENUI_CONFIG_RENDERER_TAG;
/** 不含扩展名 */
export const DEFAULT_FILE_NAME = 'genui-config-renderer';
/** 相对于执行命令的目录 */
export const DEFAULT_OUT_DIR = 'dist/web-component';

export interface WebComponentCliOptions {
  /** npm 包名或本地路径，可重复指定 */
  materials: string[];
  tagName: string;
  /** 绝对路径 */
  outDir: string;
  /** 不含扩展名 */
  fileName: string;
  minify: boolean;
  sourcemap: boolean;
  help: boolean;
  version: boolean;
}

export function createUsage(): string {
  return `使用指定物料构建 GenUI Web Component（自定义元素）。

用法：
  genui-build-web-component --materials <物料> [options]

选项：
  -m, --materials <来源>  物料来源，支持 npm 包名（如 my-materials 或 @scope/my-materials）
                          与本地路径（文件或目录，如 ./my-materials、./src/materials/index.ts）
                          可重复传入或用逗号分隔，多个物料会合并为一个产物
  -t, --tag <名称>        自定义元素标签名（默认 ${DEFAULT_TAG_NAME}）
  -o, --out-dir <目录>    产物输出目录（默认 ${DEFAULT_OUT_DIR}）
  -f, --file-name <名称>  产物文件名，不含扩展名（默认 ${DEFAULT_FILE_NAME}）
      --no-minify         关闭压缩
      --sourcemap         生成 sourcemap
  -h, --help              显示帮助
  -v, --version           显示版本号

示例：
  genui-build-web-component -m @opentiny/genui-sdk-materials-vue-element-plus
  genui-build-web-component -m ./my-materials -o dist/web-component -f my-renderer
  genui-build-web-component -m @scope/materials-a -m ./materials-b --tag my-genui`;
}

const readValue = (argv: string[], index: number, flag: string): string => {
  const value = argv[index];
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`参数 ${flag} 缺少取值`);
  }
  return value;
};

export function parseCliArgs(argv: string[], cwd = process.cwd()): WebComponentCliOptions {
  const options: WebComponentCliOptions = {
    materials: [],
    tagName: DEFAULT_TAG_NAME,
    outDir: path.resolve(cwd, DEFAULT_OUT_DIR),
    fileName: DEFAULT_FILE_NAME,
    minify: true,
    sourcemap: false,
    help: false,
    version: false,
  };

  const addMaterials = (value: string | undefined) => {
    if (!value) return;
    options.materials.push(
      ...value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--no-minify') options.minify = false;
    else if (arg === '--minify') options.minify = true;
    else if (arg === '--sourcemap') options.sourcemap = true;
    else if (arg === '--materials' || arg === '-m') addMaterials(readValue(argv, ++index, arg));
    else if (arg.startsWith('--materials=')) addMaterials(arg.slice('--materials='.length));
    else if (arg.startsWith('-m=')) addMaterials(arg.slice('-m='.length));
    else if (arg === '--tag' || arg === '-t') options.tagName = readValue(argv, ++index, arg);
    else if (arg.startsWith('--tag=')) options.tagName = arg.slice('--tag='.length);
    else if (arg === '--out-dir' || arg === '-o') options.outDir = path.resolve(cwd, readValue(argv, ++index, arg));
    else if (arg.startsWith('--out-dir=')) options.outDir = path.resolve(cwd, arg.slice('--out-dir='.length));
    else if (arg === '--file-name' || arg === '-f') options.fileName = readValue(argv, ++index, arg);
    else if (arg.startsWith('--file-name=')) options.fileName = arg.slice('--file-name='.length);
    else throw new Error(`未知参数：${arg}`);
  }

  options.materials = [...new Set(options.materials)];

  return options;
}
