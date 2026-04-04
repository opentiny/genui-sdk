/**
 * 构建 homepage、文档、playground-web，合并到仓库根目录 _site/，供 GitHub Pages 上传。。
 *
 * 本地调试：
 *  export ROOT_BASE=/ VITE_GENUI_DOCS_BASE=/doc VITE_GENUI_PLAYGROUND_HREF=/playground && node scripts/build-github-pages.mjs
 */
import { spawnSync } from 'node:child_process'
import { copyFile, cp, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')


function withTrailingSlash(s) {
  return s.endsWith('/') ? s : `${s}/`
}

function run(cmd, args, options = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
    ...options,
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function runPnpm(args, options = {}) {
  run('pnpm', args, options)
}

async function buildAllPages() {
  const rootBase = process.env.ROOT_BASE || '/genui-sdk'
  const siteBase = withTrailingSlash(`${rootBase}`)
  const playgroundBase = withTrailingSlash(`${siteBase}playground`)
  const docsBase = withTrailingSlash(`${siteBase}docs`)

  console.log(`site base: ${siteBase}`)
  console.log(`playground base: ${playgroundBase}`)
  console.log(`docs base: ${docsBase}`)


  console.log('>>> prebuild')
  runPnpm(['run', 'prebuild:playground'])

  console.log('>>> build:playground-web')
  runPnpm(['exec', 'vite', 'build', `--base=${playgroundBase}`], {
    cwd: path.join(ROOT, 'sites/playground/web'),
  })

  console.log('>>> build:docs')
  runPnpm(['exec', 'pnpm', 'build', `--base=${docsBase}`], {
    cwd: path.join(ROOT, 'docs'),
  })

  console.log('>>> build:homepage')
  runPnpm(['exec', 'pnpm', 'build:web', `--base=${siteBase}`], {
    cwd: path.join(ROOT, 'sites/homepage/web'),
  })

  const pgDist = path.join(ROOT, 'sites/playground/web/dist')
  await copyFile(path.join(pgDist, 'index.html'), path.join(pgDist, '404.html'))

  console.log('>>> assemble _site')
  const out = path.join(ROOT, '_site')
  await rm(out, { recursive: true, force: true })
  // 目标不存在时 cp 会把 dist 整棵拷成 _site，等价于 bash 的 dist/. → _site/
  await cp(path.join(ROOT, 'sites/homepage/web/dist'), out, { recursive: true })
  await cp(path.join(ROOT, 'docs/.vitepress/dist'), path.join(out, 'docs'), { recursive: true })
  await cp(path.join(ROOT, 'sites/playground/web/dist'), path.join(out, 'playground'), {
    recursive: true,
  })

  console.log(`Done. Output: ${out}`)
}

buildAllPages().catch((err) => {
  console.error(err)
  process.exit(1)
})
