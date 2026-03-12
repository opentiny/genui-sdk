import { onMounted, onUnmounted, ref } from "vue";
import { throttle } from "../utils/throttle";

export function useMobile() {
    const isMobile = ref(false);

    const updateIsMobile = () => {
        isMobile.value = window.innerWidth < 768;
    };

    const onResize = throttle(updateIsMobile, 200);

    onMounted(() => {
        updateIsMobile();
        window.addEventListener('resize', onResize);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', onResize);
    });

    return {
        isMobile
    }
}
