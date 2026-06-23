<script setup lang="ts">
import { computed, watch } from 'vue';
import { provideBuilderPreview } from '../../builder';
import { useIsMobile } from '../../hooks';
import BuilderPreviewPanel from './BuilderPreviewPanel.vue';
import BuilderSchemaEditor from './BuilderSchemaEditor.vue';

const props = defineProps({
  enabled: {
    type: Boolean,
    default: false,
  },
  theme: {
    type: String,
    default: 'light',
  },
});

const { isMobile } = useIsMobile();
const preview = provideBuilderPreview();

const schemaEditor = computed({
  get() {
    return preview.schemaEditorText.value;
  },
  set(value: string) {
    preview.syncSchemaFromEditor(value);
  },
});

const showDesktopSchemaEditor = computed(
  () => props.enabled && !isMobile.value && preview.schemaEditorVisible.value,
);

const showChat = computed(() => !showDesktopSchemaEditor.value);

watch(
  () => props.enabled,
  (enabled) => {
    if (!enabled) {
      preview.closePreview();
    }
  },
);
</script>

<template>
  <div
    :class="[
      'builder-workspace',
      {
        'builder-workspace--enabled': props.enabled,
        'builder-workspace--mobile': isMobile && props.enabled,
        'builder-workspace--preview-open': props.enabled && preview.previewPanelVisible.value,
      },
    ]"
  >
    <div class="builder-workspace__main">
      <div v-show="showChat" class="builder-workspace__chat">
        <slot />
      </div>
      <builder-schema-editor
        v-if="showDesktopSchemaEditor"
        v-model="schemaEditor"
        class="builder-workspace__schema-editor"
        :theme="props.theme"
        @close="preview.closeSchemaEditor"
      />
    </div>
    <Transition name="builder-preview-panel">
      <BuilderPreviewPanel
        v-if="props.enabled && preview.previewPanelVisible.value"
        :theme="props.theme"
      />
    </Transition>
  </div>
</template>

<style scoped lang="less">
.builder-workspace {
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &--enabled {
    display: flex;
    overflow: hidden;
  }

  &__main {
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
    display: flex;
    overflow: hidden;
  }

  &__chat {
    flex: 1;
    min-width: 0;
    min-height: 0;
    height: 100%;
  }

  &__schema-editor {
    flex: 1;
    min-width: 0;
    min-height: 0;
  }

  &--mobile.builder-workspace--enabled {
    flex-direction: column;

    &.builder-workspace--preview-open {
      .builder-workspace__main {
        flex: 1 1 50%;
      }

      :deep(.builder-preview) {
        flex: 1 1 50%;
      }
    }
  }
}

.builder-preview-panel-enter-active,
.builder-preview-panel-leave-active {
  transition:
    opacity 0.38s ease,
    transform 0.42s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.builder-preview-panel-enter-from,
.builder-preview-panel-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 768px) {
  .builder-preview-panel-enter-from,
  .builder-preview-panel-leave-to {
    transform: translateY(24px);
  }
}
</style>
