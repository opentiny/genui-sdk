<template>
  <div class="theme-card__preview-sidebar">
    <div class="theme-card__preview-logo"></div>
    <div class="theme-card__preview-new-task"></div>
    <div class="theme-card__preview-tab"></div>
    <div class="theme-card__preview-tab"></div>
    <div class="theme-card__preview-tab"></div>
  </div>
  <div class="theme-card__preview-main">
    <div class="theme-card__preview-chat-header"></div>
    <div class="theme-card__preview-bubble">
      <div class="theme-card__preview-line theme-card__preview-line--long"></div>
      <div class="theme-card__preview-line"></div>
      <div class="theme-card__preview-line theme-card__preview-line--short"></div>
    </div>
    <div class="theme-card__preview-sender">
      <div class="theme-card__preview-input"></div>
    </div>
  </div>
</template>

<style scoped lang="less">
.theme-card__preview-sidebar {
  width: 34%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 5px;
  padding: 4px 4px 0;
  margin-bottom: -1px;
  border-radius: 4px 4px 0 0;
  background: var(--sidebar-bg);
  box-sizing: border-box;
}

.theme-card__preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  box-sizing: border-box;
  background: var(--main-bg);
  border-radius: 4px 4px 0 0;
  padding: 4px 4px 0;
  margin-bottom: -1px;
  min-width: 0;
}

.theme-card__preview-logo {
  height: 8px;
  width: 72%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-new-task {
  height: 10px;
  border-radius: 4px;
  background: var(--new-task-bg);
  margin-bottom: 2px;
}

.theme-card__preview-tab {
  height: 7px;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-chat-header {
  height: 7px;
  width: 42%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-bubble {
  border-radius: 6px 6px 0 0;
  border: 1px solid var(--bubble-border);
  border-bottom: none;
  padding: 6px 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: var(--bubble-bg);
}

.theme-card__preview-line {
  height: 6px;
  border-radius: 999px;
  background: var(--skeleton-bg);
  width: 100%;
}

.theme-card__preview-line--long {
  width: 100%;
}

.theme-card__preview-line--short {
  width: 62%;
}

.theme-card__preview-input {
  height: 8px;
  width: 74%;
  border-radius: 999px;
  background: var(--skeleton-bg);
}

.theme-card__preview-sender {
  border-radius: 0;
  border: 1px solid var(--sender-border);
  border-bottom: 1px solid var(--sender-border);
  padding: 4px;
  margin-bottom: -1px;
  background: var(--sender-bg);
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}
</style>
