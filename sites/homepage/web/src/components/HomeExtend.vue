<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import { TinyButton, TinyButtonGroup } from '@opentiny/vue'
import { SchemaRenderer } from '@opentiny/genui-sdk-vue'
import { IconArrowRight } from '@opentiny/vue-icon'
import genuiGuideDefault from '@/assets/genui_guide_default.svg'

// 注册 JSON 语言（如果尚未注册）
if (!hljs.getLanguage('json')) {
  hljs.registerLanguage('json', json)
}

interface IUserMessage {
  role: 'user'
  content: string
  customMessage?: string
}

interface IAssistantMessage {
  role: 'assistant'
  content: string
}

type IMessage = IUserMessage | IAssistantMessage

const TinyIconArrowRight = IconArrowRight()

const message = ref<IMessage | null>(null)
const extendSelect = ref('element')
const generating = ref(false)
const schemaRendererRef = ref<HTMLElement | null>(null)
const hasStartedStreaming = ref(false)

// 生成所有 chunk 文件路径（共 239 个）
const getChunkPath = (index: number): string => {
  const chunkNum = String(index + 1).padStart(3, '0')
  try {
    // 使用 import.meta.url 构建相对于打包后文件的路径
    // 打包后文件在 dist/index.js，静态文件在 dist/static/
    const baseUrl = new URL(import.meta.url)
    const staticBaseUrl = new URL('./static/', baseUrl)
    const chunkUrl = new URL(`caculator-stream/chunk-${chunkNum}.json`, staticBaseUrl)
    return chunkUrl.href
  } catch (error) {
    // 如果 import.meta.url 不可用，使用相对路径作为备选
    // 打包后文件在 dist/index.js，静态文件在 dist/static/
    return `./static/caculator-stream/chunk-${chunkNum}.json`
  }
}

const handleExtendClick = (value: string) => {
  extendSelect.value = value
}

const handleAction = ({
  llmFriendlyMessage,
  humanFriendlyMessage
}: {
  llmFriendlyMessage: string
  humanFriendlyMessage: string
}) => {
  // 处理按钮点击事件
  console.log('Action:', { llmFriendlyMessage, humanFriendlyMessage })
}

const handleEnterPlayground = () => {

}

// 格式化 JSON 内容用于显示
const formattedJsonContent = computed(() => {
  if (!message.value?.content) return ''
  
  try {
    // 尝试解析 JSON，如果成功则格式化
    const parsed = JSON.parse(message.value.content)
    return JSON.stringify(parsed, null, 2)
  } catch (error) {
    // 如果 JSON 不完整（流式渲染中），直接返回原始内容
    return message.value.content
  }
})

// 监听 content 变化，更新代码高亮
const codeRef = ref<HTMLElement | null>(null)

watch(() => message.value?.content, () => {
  nextTick(() => {
    // 使用 highlight.js 更新代码高亮
    if (codeRef.value) {
      hljs.highlightElement(codeRef.value)
    }
  })
})

// 流式加载 chunk 文件
const loadChunksStreaming = async () => {
  if (hasStartedStreaming.value) return
  hasStartedStreaming.value = true

  generating.value = true
  let accumulatedContent = ''

  // 初始化 message
  if (!message.value) {
    message.value = {
      role: 'assistant',
      content: ''
    }
  }

  const totalChunks = 239

  try {
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = getChunkPath(i)

      // 使用 fetch 读取 chunk 文件内容
      const response = await fetch(chunkPath)
      if (!response.ok) {
        throw new Error(`Failed to load chunk ${i + 1}: ${response.statusText}`)
      }
      const chunkContent = await response.text()

      // 拼接内容
      accumulatedContent += chunkContent

      // 更新 message content
      if (message.value) {
        message.value.content = accumulatedContent
      }

      // 最后一个 chunk 后，设置 generating 为 false
      if (i === totalChunks - 1) {
        generating.value = false
      } else {
        // 延时 300ms 加载下一个 chunk
        await new Promise((resolve) => setTimeout(resolve, 50))
      }

      nextTick(() => {
    // 使用 highlight.js 更新代码高亮
    if (codeRef.value) {
      hljs.highlightElement(codeRef.value)
    }
  })
    }
  } catch (error) {
    console.error('Error loading chunks:', error)
    generating.value = false
  }
}

// 使用 Intersection Observer 检测 SchemaRenderer 是否在视口中
let observer: IntersectionObserver | null = null

onMounted(() => {
  // 初始化 message 为空，等待流式加载
  message.value = {
    role: 'assistant',
    content: ''
  }

  // 创建 Intersection Observer
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasStartedStreaming.value) {
          // 当 SchemaRenderer 进入视口时，开始流式加载
          loadChunksStreaming()
        }
      })
    },
    {
      threshold: 0.1 // 当 10% 的元素可见时触发
    }
  )

  // 等待 DOM 更新后观察元素
  setTimeout(() => {
    if (schemaRendererRef.value) {
      observer?.observe(schemaRendererRef.value)
    }
  }, 100)

  // 初始化代码高亮
  nextTick(() => {
    if (codeRef.value) {
      hljs.highlightElement(codeRef.value)
    }
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
})
</script>

<template>
  <section class="home-extend">
    <div class="home-extend-title genui-title">解锁更多玩法</div>
    <tiny-button-group class="extend-button-group" v-model="extendSelect">
      <tiny-button
        class="extend-button extend-button-element-1"
        :class="{ 'extend-button-element-active': extendSelect === 'element' }"
        value="element"
        @click="handleExtendClick('element')"
        >计算器</tiny-button
      >
      <tiny-button
        class="extend-button extend-button-element-2"
        :class="{ 'extend-button-element-active': extendSelect === 'page' }"
        value="page"
        @click="handleExtendClick('page')"
        >Todo应用</tiny-button
      >
    </tiny-button-group>
    <div class="home-extend-schema" ref="schemaRendererRef">
      <div class="home-extend-schema-header">
        <div class="home-extend-schema-header-action">
          <div class="home-extend-schema-header-action-close"></div>
          <div class="home-extend-schema-header-action-full"></div>
          <div class="home-extend-schema-header-action-exit"></div>
        </div>
        <div class="home-extend-schema-header-subtitle" @click="handleEnterPlayground">
          <span>进入 Playground</span>
          <tiny-icon-arrow-right />
        </div>
      </div>
      <div class="home-extend-schema-content">
        <div class="home-extend-schema-renderer-container">
          <SchemaRenderer
          v-if="message && message.content"
          class="home-extend-schema-renderer"
          :content="message.content"
          :generating="generating"
          :onAction="handleAction"
          @saveState="() => {}"
        />
        <img v-else :src="genuiGuideDefault" alt="genui-guide-default" />
        </div>
        <div class="home-extend-schema-code">
          <pre
            v-if="message && message.content"
            class="extend-code-content"
          ><code ref="codeRef" class="language-json">{{ formattedJsonContent }}</code></pre>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped>
@import '../style/index.less';

.home-extend {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 30px 8% 0px 8%;

  &-title {
    margin-bottom: 40px;
  }

  &-schema {
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, rgba(232, 238, 254, 1), rgba(232, 238, 254, 0.3) 100%);
    border-radius: 24px;
    padding: 3%;

    &-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 26px;

      &-action {
        display: flex;
        gap: 16px;

        &-close {
          width: 16px;
          height: 16px;
          background-color: rgba(254, 3, 4, 1);
          border-radius: 50%;
        }

        &-full {
          width: 16px;
          height: 16px;
          background-color: rgba(254, 199, 3, 1);
          border-radius: 50%;
        }

        &-exit {
          width: 16px;
          height: 16px;
          background-color: rgba(0, 207, 106, 1);
          border-radius: 50%;
        }
      }

      &-subtitle {
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(20, 118, 255, 1);
        cursor: pointer;

        svg {
          fill: rgba(20, 118, 255, 1);
        }
      }
    }

    &-content {
      display: flex;
      width: 100%;
      background: #fff;
      border-radius: 12px;
      padding: 5% 5%;
    }

    &-renderer {
      
      &-container {
        height: 100%;
        min-width: 50%;
        padding-right: 3%;
        border-right: 1px solid rgba(205, 218, 253, 1);
      }
    }

    &-code {
      height: 400px;
      width: 50%;
      overflow-y: auto;
      margin-left: 3%;

      code {
        white-space: pre-wrap;
        word-wrap: break-word;
      }
    }
  }

  /deep/ .tiny-button {
    margin-left: 0;
    border-radius: 0;
    border: none;
    background-color: rgba(243, 243, 244, 1);
  }
}

.extend-button-group {
  border-radius: 382px;
  width: fit-content;
  height: 56px;
  background-color: rgba(243, 243, 244, 1);
  display: flex;
  align-items: center;
  padding: 4px;
  margin-bottom: 60px;

  .extend-button {
    height: 100%;
    width: 200px;
    background-color: rgba(243, 243, 244, 1);

    &-element-1 {
      border-radius: 382px;
    }

    &-element-2 {
      border-radius: 382px;
    }

    &-element-active {
      background-color: #fff;
    }
  }
}
</style>

<style>
.extend-code-content {
  background: #ffffff !important;
  padding: 0 !important;
  margin: 0 !important;
  overflow: auto !important;
  max-height: 100%;

  /* highlight.js 样式 */
  .hljs {
    display: block;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5em;
    color: rgb(25, 25, 25);
    background: #ffffff;
  }

  .hljs-attr {
    color: rgb(0, 0, 255);
  }

  .hljs-string {
    color: rgb(148, 43, 41);
  }

  .hljs-number {
    color: rgb(5, 129, 4);
  }

  .hljs-literal {
    color: rgb(5, 129, 4);
  }

  .hljs-keyword {
    color: rgb(0, 0, 255);
  }

  .hljs-punctuation {
    color: rgb(25, 25, 25);
  }

  .hljs-operator {
    color: rgb(25, 25, 25);
  }

  .hljs-built_in {
    color: rgb(5, 129, 4);
  }
}
</style>
