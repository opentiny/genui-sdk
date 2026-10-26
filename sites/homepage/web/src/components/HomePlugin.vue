<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import dshIcon from '@/assets/home_plugin_dsh_icon.svg';
import crossIcon from '@/assets/home_plugin_cross_icon.svg';
import deepseekIcon from '@/assets/home_plugin_deepseek_icon.svg';
import copyIcon from '@/assets/copy.svg';
import checkmarkIcon from '@/assets/checkmark.svg';
import { t } from '@/i18n';


const installCommand = 'dsh plugin --profile web add dsh-genui';

type CopyState = 'idle' | 'success' | 'fail';

const copyState = ref<CopyState>('idle');
let copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

onUnmounted(() => {
  clearTimeout(copyFeedbackTimer);
});

const copyLabel = computed(() => {
  if (copyState.value === 'success') {
    return t('plugin.copied');
  }
  if (copyState.value === 'fail') {
    return t('plugin.copyFail');
  }
  return t('plugin.copy');
});

const copyText = (text: string) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const succeeded = document.execCommand('copy');
  document.body.removeChild(textarea);
  return succeeded;
};

const handleCopyCommand = async () => {
  let succeeded = false;
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('clipboard api unavailable');
    }
    await navigator.clipboard.writeText(installCommand);
    succeeded = true;
  } catch {
    succeeded = copyText(installCommand);
  }

  copyState.value = succeeded ? 'success' : 'fail';

  clearTimeout(copyFeedbackTimer);
  copyFeedbackTimer = setTimeout(
    () => {
      copyState.value = 'idle';
    },
    succeeded ? 500 : 2000,
  );
};
</script>

<template>
  <section class="home-plugin">
    <div class="home-plugin-header">
      <div class="home-plugin-title genui-title">{{ t('plugin.title') }}</div>
      <div class="home-plugin-subtitle genui-subtitle">{{ t('plugin.subtitle') }}</div>
    </div>
    <div class="home-plugin-content">
      <div class="home-plugin-content-icons">
        <img :src="dshIcon" alt="">
        <img class="home-plugin-content-icons-cross" :src="crossIcon" alt="">
        <img :src="deepseekIcon" alt="">
      </div>
      <div class="home-plugin-content-text">
        {{ t('plugin.text.prefix') }}<span>{{ t('plugin.text.embed') }}</span>{{ t('plugin.text.suffix') }}
      </div>
      <div class="home-plugin-content-descript">
        {{ t('plugin.description') }}
      </div>
      <div class="home-plugin-content-copy">
        <span>{{ installCommand }}</span>
        <button type="button" class="home-plugin-content-copy-btn" @click="handleCopyCommand">
          <img :src="copyState === 'success' ? checkmarkIcon : copyIcon" alt="">
          <span aria-live="polite">{{ copyLabel }}</span>
          <img class="home-plugin-content-copy-btn-preload" :src="checkmarkIcon" alt="" aria-hidden="true">
        </button>
      </div>
    </div>
  </section>

</template>

<style lang="less" scoped>
.home-plugin {
  width: 100%;
  margin-bottom: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-image: url('@/assets/home_plugin_bg.svg');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  padding: 0 12.5% 110px;

  @media (max-width: 1280px) {
    padding: 80px 10%;
  }

  @media (max-width: 768px) {
    padding: 40px 10% 40px 10%;
  }

  @media (min-width: 1920px) {
    padding: 110px 240px;
  }

  &-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 680px;
    padding: 50px 89px 56px;
    background-color: #fff;
    border-radius: 20px;

    &-icons {
      display: flex;
      align-items: center;
      width: 150px;
      height: 52px;
      gap: 13px;

      &-cross {
        width: 20px;
        height: 20px;
      }
    }

    &-text {
      margin-top: 30px;
      font-size: 24px;
      font-weight: 600;

      span {
        color: rgba(192, 19, 59, 1)
      }
    }

    &-descript {
      margin-top: 12px;
      width: 100%;
      font-size: 16px;
      line-height: 22px;
      color: rgba(128, 128, 128, 1);
      text-align: center;
    }

    &-copy {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 30px;
      width: 100%;
      height: 48px;
      background-color: rgba(29, 29, 29, 1);
      border-radius: 10px;

      span {
        margin-left: 22px;
        font-size: 16px;
        line-height: 24px;
        color: rgba(255, 255, 255, 1)
      }

      &-btn {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;

        margin-right: 4px;
        width: 84px;
        height: 40px;
        border: none;
        padding: 0;
        font-family: inherit;
        border-radius: 6px;
        background-color: rgba(195, 31, 59, 1);
        cursor: pointer;

        span {
          margin-left: 4px;
          font-size: 16px;
          font-weight: 400;
        }

        &-preload {
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          pointer-events: none;
        }
      }
    }
  }

  @media (max-width: 768px) {
    padding-inline: 20px;
    &-header &-title.genui-title {
      font-size: 18px;
      line-height: 24px;
      margin-bottom: 11px;
    }
    &-content {
      width: 100%;
      padding: 30px 20px 30px 20px;
      padding-bottom: 30px;

      &-text {
        margin-top: 15px;
        font-size: 16px;
      }

      &-descript {
        width: 100%;
        font-size: 14px;
        text-align: justify;
        text-justify: inter-ideograph;
      }
      &-copy {
        width: 100%;
        > span {
          flex: 1 1 0;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }
  }

}
</style>