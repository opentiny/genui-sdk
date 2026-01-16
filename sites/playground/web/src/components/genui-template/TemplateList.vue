<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { IconDel, IconEdit, IconPlus } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';

const TinyIconDel = IconDel();
const TinyIconEdit = IconEdit();
const TinyIconPlus = IconPlus();

const emit = defineEmits(['item-click', 'item-action', 'item-title-change', 'add-item']);

const props = defineProps<{
  listData: Conversation[];
  currentId: string;
}>();

// 列表项状态
const renameId = ref<string | null>(null); // 当前正在重命名的 id
const editText = ref(''); // 重命名输入框的值
const renameInputRef = ref(null); // 重命名输入框的ref

// 处理重命名
const handleRename = (item: Conversation) => {
  renameId.value = item.id;
  editText.value = item.title;
  // 延迟让输入框获取焦点
  nextTick(() => {
    renameInputRef.value?.focus();
  });
};

// 确认重命名
const confirmRename = () => {
  if (!renameId.value) return;

  const title = editText.value.trim();

  if (title) {
    emit('item-title-change', renameId.value, title);
    renameId.value = null;
  }
};

// 处理删除
const handleDelete = (item: Conversation) => {
  emit('item-action', { id: 'delete' }, item);
};

const handleItemClick = (item: Conversation) => {
  emit('item-click', item);
};

// 处理新增
const handleAdd = () => {
  emit('add-item');
};
</script>

<template>
  <div class="list-container">
    <!-- 头部：自定义示例 + 增加图标 -->
    <div class="header-container">
      <span class="header-title">自定义示例</span>
      <button class="add-icon-button" @click="handleAdd" title="新增">
        <TinyIconPlus class="action-icon-icon"></TinyIconPlus>
      </button>
    </div>

    <!-- 列表容器 -->
    <ul class="item-list">
      <li
        v-for="item in props.listData"
        :key="item.id"
        :class="{ 'list-item': true, active: currentId === item.id }"
        @click="handleItemClick(item)"
      >
        <!-- 列表项文本/重命名输入框 -->
        <div class="item-content">
          <template v-if="renameId === item.id">
            <input
              v-model="editText"
              class="rename-input"
              @blur="confirmRename"
              @keyup.enter="confirmRename"
              ref="renameInputRef"
            />
          </template>
          <template v-else>
            {{ item.title }}
          </template>
        </div>

        <!-- 悬浮时显示的操作图标（非重命名状态显示） -->
        <template v-if="renameId !== item.id">
          <div class="action-icons">
            <button class="action-icon rename-icon" @click.stop="handleRename(item)" title="重命名">
              <TinyIconEdit class="action-icon-icon"></TinyIconEdit>
            </button>
            <button class="action-icon delete-icon" @click.stop="handleDelete(item)" title="删除">
              <TinyIconDel class="action-icon-icon"></TinyIconDel>
            </button>
          </div>
        </template>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.list-container {
  width: 300px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* 头部容器 */
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 8px;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
}

.add-icon-button {
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  color: #6b7280;
}

.add-icon-button:hover {
  background-color: #f9fafb;
}

.add-icon-button .add-icon {
  font-size: 18px;
  font-weight: 300;
  line-height: 1;
}

.item-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ffffff;
}

.list-item:hover,
.list-item.active {
  background-color: #fafafa;
}

/* 列表项文本容器 */
.item-content {
  flex: 1; /* 占满剩余空间 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 操作图标容器 */
.action-icons {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 8px;
}

.list-item:hover .action-icons {
  opacity: 1;
}

/* 操作图标按钮 */
.action-icon {
  width: 20px;
  height: 20px;
  padding: 0;
  background-color: transparent;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.action-icon:hover {
  background-color: #e5e7eb;
  color: #111827;
}

.action-icon.delete-icon:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

/* 重命名输入框样式 */
.rename-input {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #d1d5db;
  border-radius: 3px;
  outline: none;
  font-size: 14px;
  box-sizing: border-box;
}

.rename-input:focus {
  border-color: #2563eb;
}

.action-icon-icon {
  font-size: 16px;
}
</style>
