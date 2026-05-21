<script setup>
import { ref, inject, nextTick, computed } from 'vue';
import { TinyButton, TinySwitch, TinyPopover, TinyCollapseItem, TinyNotify } from '@opentiny/vue';
import SkillFormDialog from './SkillFormDialog.vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';
import { fileListToSkillModules, pickMainSkillOverview, remapModulesByName } from './index';

const playgroundContext = inject('playgroundContext');
const { llmConfig = {} } = playgroundContext || {};

const IconPlus = iconPlus();
const IconDel = iconDel();
const IconEdit = iconEdit();
const IconEllipsis = iconEllipsis();

const showSkills = computed(() => llmConfig.skills?.length > 0);

const showSkillFormDialog = ref(false);
const skillData = ref({
  name: '',
  description: '',
  content: '',
  modules: null,
  index: -1,
});

const closeSkillDialog = () => {
  showSkillFormDialog.value = false;
  skillData.value = {
    name: '',
    description: '',
    content: '',
    modules: null,
    index: -1,
  };
};

const addSkill = () => {
  skillData.value = {
    name: '',
    description: '',
    content: '',
    modules: null,
    index: -1,
  };
  showSkillFormDialog.value = true;
};

const editSkill = (skill, index) => {
  skillData.value = {
    name: skill.name || '',
    description: skill.description || '',
    content: skill.content || '',
    modules: skill.modules && Object.keys(skill.modules).length ? { ...skill.modules } : null,
    index,
  };
  showSkillFormDialog.value = true;
};

const deleteSkill = (index) => {
  const skills = llmConfig.skills || [];
  llmConfig.skills = skills.filter((_, i) => i !== index);
};

const updateSkillEnabled = (index, enabled) => {
  const skills = llmConfig.skills || [];
  llmConfig.skills = skills.map((s, i) => (i === index ? { ...s, enabled } : s));
};

const onFolderInputChange = async (e) => {
  const input = e.target;
  const files = input.files;

  try {
    if (!files?.length) {
      TinyNotify({
        type: 'info',
        message: '未选择任何文件，或所选文件夹为空',
        position: 'top-right',
      });
      return;
    }

    const dialogWasOpen = showSkillFormDialog.value;
    const prevIndex = skillData.value.index;
    const packHint = skillData.value.name.trim() || 'skill';
    const { modules, skippedFileNum } = await fileListToSkillModules(files, packHint);

    if (!Object.keys(modules).length) {
      TinyNotify({
        type: 'warning',
        message: `共选中 ${files.length} 个文件，没有可导入的文本类文件（需为 .md、.txt、.json、.yaml 等常见文本扩展名）。`,
        position: 'top-right',
      });
      return;
    }

    const overview = pickMainSkillOverview(modules);
    const remapModules = remapModulesByName(modules, overview);

    skillData.value = {
      ...skillData.value,
      modules: remapModules,
      content: '',
      name: overview?.name || skillData.value.name || packHint,
      description: overview?.description || skillData.value.description || '',
      index: dialogWasOpen ? prevIndex : -1,
    };

    showSkillFormDialog.value = true;
    // 先显示dialog，在弹出notify，避免notify被dialog遮挡
    await new Promise((resolve) => setTimeout(resolve, 0));

    const n = Object.keys(remapModules).length;
    let doneMsg = `已导入 ${n} 个文本文件`;
    if (skippedFileNum > 0) {
      doneMsg += `（已跳过 ${skippedFileNum} 个扩展名不匹配的文件）`;
    }
    doneMsg += '。表单已打开，请核对名称与描述后点击「确认」保存到列表。';
    TinyNotify({
      type: 'success',
      message: doneMsg,
      position: 'top-right',
    });

    if (!overview) {
      TinyNotify({
        type: 'warning',
        message:
          '未检测到形如 ./目录名/SKILL.md 的主入口，对话摘要可能不完整；可调整目录结构或仍通过 get_skill_content 按路径读取子文档。',
        position: 'top-right',
      });
    }
  } catch (err) {
    const msg = err && typeof err === 'object' && 'message' in err ? err.message : String(err);
    TinyNotify({
      type: 'error',
      message: `读取文件夹失败：${msg}`,
      position: 'top-right',
    });
  } finally {
    input.value = '';
  }
};

const confirmSkill = () => {
  const { name, description, content, modules, index } = skillData.value;
  const skillName = (name || '').trim();
  const hasModules = modules && typeof modules === 'object' && Object.keys(modules).length > 0;

  const skills = llmConfig.skills || [];
  const enabled = index > -1 ? (skills[index]?.enabled ?? true) : true;

  const nextSkill = {
    name: skillName,
    description: (description || '').trim(),
    enabled,
  };

  if (hasModules) {
    nextSkill.modules = { ...modules };
  } else {
    nextSkill.content = (content || '').trim();
  }

  if (index > -1) {
    skills[index] = nextSkill;
  } else {
    skills.push(nextSkill);
  }

  llmConfig.skills = skills;
  closeSkillDialog();
};
</script>

<template>
  <tiny-collapse-item name="skills" title="Skills">
    <template #title-right>
      <span class="skill-panel-title-actions" @click.stop>
        <label for="playground-skill-folder-import" class="skill-folder-text-btn">导入文件夹</label>
        <tiny-button type="text" :icon="IconPlus" @click="addSkill"> </tiny-button>
      </span>
    </template>
    <div class="skills-list" v-show="showSkills">
      <div class="skills-item" v-for="(skill, index) in llmConfig.skills || []" :key="`skill-${index}`">
        <div class="skills-item-header">
          <div class="skills-item-name">{{ skill.name }}</div>
          <div>
            <tiny-switch
              :model-value="skill.enabled !== false"
              @update:model-value="updateSkillEnabled(index, $event)"
              class="skills-item-enabled"
            ></tiny-switch>
            <tiny-popover
              trigger="hover"
              popper-class="skills-item-actions-popover"
              :visible-arrow="false"
              :append-to-body="false"
            >
              <template #default>
                <div class="skills-item-actions">
                  <div @click="editSkill(skill, index)">
                    <component :is="IconEdit" />
                    <span>编辑</span>
                  </div>
                  <div @click="deleteSkill(index)">
                    <component :is="IconDel" />
                    <span>移除</span>
                  </div>
                </div>
              </template>
              <template #reference>
                <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
              </template>
            </tiny-popover>
          </div>
        </div>
      </div>
    </div>
    <div v-show="!showSkills" class="skills-list-empty">
      <div class="skills-item-empty">
        <div class="skills-item-empty-icon">
          <label for="playground-skill-folder-import" class="skill-folder-text-btn skill-folder-btn-inline" @click.stop
            >导入技能文件夹</label
          >
          或右上角
          <component :is="IconPlus" class="skills-item-empty-plus-icon" />
          添加单条
        </div>
      </div>
    </div>
    <SkillFormDialog
      v-model:visible="showSkillFormDialog"
      v-model:skill-data="skillData"
      :all-skills="llmConfig.skills || []"
      @close="closeSkillDialog"
      @confirm="confirmSkill"
    />
    <input
      id="playground-skill-folder-import"
      type="file"
      class="skill-folder-sr-only"
      webkitdirectory
      multiple
      @change="onFolderInputChange"
    />
  </tiny-collapse-item>
</template>

<style scoped lang="less">
.skill-panel-title-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 勿用 display:none / pointer-events:none，否则部分浏览器下无法通过 label 触发选文件夹 */
.skill-folder-sr-only {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.skill-folder-text-btn {
  cursor: pointer;
  padding: 0 6px;
  font-size: 12px;
  color: var(--ti-base-color-brand-6, #1890ff);
  user-select: none;
}

.skill-folder-text-btn:hover {
  opacity: 0.85;
}

.skill-folder-btn-inline {
  padding: 0 4px;
  font-size: 13px;
  vertical-align: baseline;
}

.skills-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .skills-item {
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(246, 246, 246, 1);
    }

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    &-name {
      font-size: 14px;
      font-weight: 600;
      color: #191919;
    }

    &-enabled {
      margin-left: 4px;
    }
  }
}

.skills-list-empty {
  margin-top: 12px;
}

.skills-item-empty {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.skills-item-empty-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;
}

.skills-item-empty-plus-icon {
  width: 12px;
  height: 12px;
  color: #595959;
}

:deep(.skills-item-actions-popover) {
  padding: 0;
  border: none;
}

.skills-item-actions {
  & > div {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 16px;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
