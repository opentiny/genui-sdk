import { computed, ref } from 'vue';
import { useIsMobile } from '../../../use-mobile';

type SidePanel = 'history';

const rendererPanelVisible = ref(
  typeof window !== 'undefined' ? window.innerWidth > 768 : true,
);
const schemaEditorVisible = ref(false);
const sidePanel = ref<SidePanel | null>(null);

const isHistoryPanelOpen = computed(() => sidePanel.value === 'history');
const isJsonEditorActive = computed(() => schemaEditorVisible.value);

export function useTemplateUi() {
  const { isMobile } = useIsMobile();

  function setRendererPanelVisible(visible: boolean) {
    rendererPanelVisible.value = visible;
  }

  function setJsonEditorOpen(open: boolean) {
    schemaEditorVisible.value = open;
  }

  function toggleHistoryPanel() {
    sidePanel.value = sidePanel.value === 'history' ? null : 'history';
  }

  function closeHistoryPanel() {
    sidePanel.value = null;
  }

  function resetUi() {
    schemaEditorVisible.value = false;
    rendererPanelVisible.value = !isMobile.value;
    sidePanel.value = null;
  }

  return {
    schemaEditorVisible,
    rendererPanelVisible,
    isJsonEditorActive,
    isHistoryPanelOpen,
    setJsonEditorOpen,
    setRendererPanelVisible,
    toggleHistoryPanel,
    closeHistoryPanel,
    resetUi,
  };
}
