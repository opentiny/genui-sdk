<script setup lang="ts">
import { TinyDropdown } from '@opentiny/vue';
import { setLocale } from '../i18n';
import { iconLanguage } from '@opentiny/vue-icon';

const IconLanguage = iconLanguage();

const langOptions = [
  { label: '简体中文', value: 'zh_CN' },
  { label: 'English', value: 'en_US' },
];

const menuOptions = {
  options: langOptions,
  placement: 'top-start',
};

const itemClick = (payload: { itemData?: { value?: string } }) => {
  const value = payload?.itemData?.value;
  if (value) {
    setLocale(value);
  }
};
</script>

<template>
  <div class="language-switcher">
    <tiny-dropdown
      trigger="click"
      title=""
      :prefix-icon="IconLanguage"
      :show-icon="false"
      :menu-options="menuOptions"
      @item-click="itemClick"
    />
  </div>
</template>

<style scoped>
.language-switcher :deep(.tiny-dropdown) {
  color: #191919;
  stroke: #808080;
}
.language-switcher :deep(.tiny-dropdown__prefix-inner svg) {
  fill: #191919;
}
</style>
