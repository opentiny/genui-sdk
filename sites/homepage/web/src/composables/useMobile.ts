import { onMounted, ref } from "vue";

export function useMobile() {
    const isMobile = ref(false);

    onMounted(() => {
        isMobile.value = window.innerWidth < 768;
    });

    return {
        isMobile
    }
}