import { onMounted, onUnmounted, ref } from "vue";

export function useMobile() {
    const isMobile = ref(false);

    const updateIsMobile = () => {
        isMobile.value = window.innerWidth < 768;
    };

    onMounted(() => {
        updateIsMobile();   
        window.addEventListener('resize', updateIsMobile);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', updateIsMobile);
    });

    return {
        isMobile
    }
}
