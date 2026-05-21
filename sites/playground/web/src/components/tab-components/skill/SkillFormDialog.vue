<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { TinyButton, TinyDialogBox, TinyForm, TinyFormItem, TinyInput } from '@opentiny/vue';
import SkillModulesExplorer from './SkillModulesExplorer.vue';
import { buildSingleModules, parseFrontMatterNameDesc } from './index';

const props = defineProps({
  allSkills: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'confirm']);

const visible = defineModel('visible', { type: Boolean, default: false });
const skillData = defineModel('skillData', { type: Object, required: true });

const skillFormRef = ref(null);

const rules = computed(() => ({
  name: [
    {
      validator: (rule, value, callback) => {
        const skillName = (value || '').trim();
        if (!skillName) {
          callback(new Error('请填写 Skill 名称'));
          return;
        }
        const index = skillData.value.index ?? -1;
        const dup = (props.allSkills || []).some(
          (s, i) => i !== index && (s.name || '').trim() === skillName,
        );
        if (dup) {
          callback(new Error(`已存在名为「${skillName}」的 Skill，名称不可重复`));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
  modules: [
    {
      validator: (rule, value, callback) => {
        const hasModules = value && typeof value === 'object' && Object.keys(value).length > 0;
        const hasContent = (skillData.value.content || '').trim();
        if (!hasModules && !hasContent) {
          callback(new Error('请导入文件夹或填写单文档内容'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
}));

watch(visible, (v) => {
  if (!v) {
    nextTick(() => {
      skillFormRef.value?.clearValidate?.();
    });
  }
});

const handleDialogClose = () => {
  emit('close');
};

const clearImportedFolder = () => {
  skillData.value = {
    ...skillData.value,
    modules: null,
  };
  nextTick(() => {
    skillFormRef.value?.validateField?.('modules');
  });
};

const onContentInput = () => {
  nextTick(() => {
    skillFormRef.value?.validateField?.('modules');
  });
};

const onModulesEdit = () => {
  nextTick(() => {
    skillFormRef.value?.validateField?.('modules');
  });
};

const onContentPaste = (e) => {
  const text = e.clipboardData.getData('text/plain');
  e.target.value = text;
  const parsed = parseFrontMatterNameDesc(text || '');
  if (parsed) {
    if (!(skillData.value.name || '').trim()) skillData.value.name = parsed.name;
    if (!(skillData.value.description || '').trim()) skillData.value.description = parsed.description;
  }
  onContentInput();
};

const submit = () => {
  skillFormRef.value?.validate?.((valid) => {
    if (valid) {
      const content = (skillData.value.content || '').trim();
      if (content) {
        skillData.value.modules = buildSingleModules(content, skillData.value.name || 'skill');
      }
      emit('confirm');
    }
  });
};
</script>

<template>
  <tiny-dialog-box
    v-model:visible="visible"
    :title="skillData.index > -1 ? '编辑 Skill' : '添加 Skill'"
    width="1000px"
    :append-to-body="true"
    @close="handleDialogClose"
  >
    <tiny-form
      ref="skillFormRef"
      :model="skillData"
      :rules="rules"
      label-width="120px"
      label-position="left"
    >
      <tiny-form-item label="名称" prop="name" required>
        <tiny-input v-model="skillData.name" placeholder="列表展示名称，可与 SKILL.md 中 name 一致"></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="描述" prop="description" required>
        <tiny-input
          type="textarea"
          v-model="skillData.description"
          placeholder="列表摘要；导入文件夹时可从主 SKILL.md 自动带出"
        ></tiny-input>
      </tiny-form-item>
      <tiny-form-item label="技能包" prop="modules">
        <div class="skill-pack-row">
          <label for="playground-skill-folder-import" class="skill-folder-pick-btn">选择文件夹</label>
          <tiny-button v-if="skillData.modules && Object.keys(skillData.modules).length" type="text" @click="clearImportedFolder">
            清除文件夹，改用手写单文档
          </tiny-button>
        </div>
        <div v-if="skillData.modules && Object.keys(skillData.modules).length" class="skill-pack-summary">
          已加载 {{ Object.keys(skillData.modules).length }} 个文件；对话时仅注入技能摘要，完整文档由模型通过 get_skill_content
          按需拉取（渐进式披露）。
        </div>
        <SkillModulesExplorer
          v-if="skillData.modules && Object.keys(skillData.modules).length"
          v-model:modules="skillData.modules"
          @modules-edit="onModulesEdit"
        />
      </tiny-form-item>
      <tiny-form-item v-if="!skillData.modules || !Object.keys(skillData.modules).length" label="单文档内容" prop="content">
        <tiny-input
          type="textarea"
          v-model="skillData.content"
          :autosize="{ minRows: 12, maxRows: 20 }"
          placeholder="未导入文件夹时，可在此粘贴整份 SKILL.md；粘贴后会自动解析出名称与描述"
          @paste="onContentPaste"
          @update:model-value="onContentInput"
        ></tiny-input>
      </tiny-form-item>
    </tiny-form>
    <template #footer>
      <tiny-button type="primary" @click="submit">确认</tiny-button>
    </template>
  </tiny-dialog-box>
</template>

<style scoped lang="less">
.skill-folder-pick-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 16px;
  font-size: 14px;
  line-height: 22px;
  color: var(--ti-base-color-brand-6, #1890ff);
  background: #fff;
  border: 1px solid var(--ti-base-color-brand-6, #1890ff);
  border-radius: 4px;
  user-select: none;
}

.skill-folder-pick-btn:hover {
  opacity: 0.9;
}

.skill-pack-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.skill-pack-summary {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}
</style>
