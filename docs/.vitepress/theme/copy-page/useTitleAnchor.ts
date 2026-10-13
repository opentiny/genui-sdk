import { onUnmounted, ref } from 'vue';
import { inBrowser, onContentUpdated } from 'vitepress';

const COPY_ANCHOR_ID = 'vp-doc-copy-anchor';

function cleanupTitleRow(): void {
  const row = document.querySelector('.vp-doc-title-row');
  if (!row?.parentElement) {
    return;
  }

  const h1 = row.querySelector('h1');
  if (h1) {
    row.parentElement.insertBefore(h1, row);
  }

  row.remove();
}

function mountTitleActions(): HTMLElement | null {
  cleanupTitleRow();

  const doc = document.querySelector('.VPDoc .vp-doc');
  const h1 = doc?.querySelector('h1');
  if (!h1?.parentElement) {
    return null;
  }

  const row = document.createElement('div');
  row.className = 'vp-doc-title-row';
  h1.parentElement.insertBefore(row, h1);
  row.appendChild(h1);

  const actions = document.createElement('div');
  actions.className = 'vp-doc-title-actions';
  actions.id = COPY_ANCHOR_ID;
  row.appendChild(actions);

  return actions;
}

export function useTitleAnchor() {
  const anchor = ref<HTMLElement | null>(null);

  function refreshAnchor(): void {
    if (!inBrowser) {
      return;
    }

    anchor.value = mountTitleActions();
  }

  onContentUpdated(refreshAnchor);

  onUnmounted(() => {
    if (inBrowser) {
      cleanupTitleRow();
    }
    anchor.value = null;
  });

  return { anchor };
}
