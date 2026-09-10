import { onMounted, onUnmounted, ref } from "vue";
import { throttle } from "../utils/throttle";

/**
 * 判断当前是否处于「移动端」布局。
 * @param breakpoint 断点宽度（px），window.innerWidth 小于该值即视为移动端，默认 768。
 *                   各区块的移动端区间并不完全一致（例如 HomeGuide 是 1280），
 *                   需要偏离默认值时在此显式传入，不要再各写一份 resize 监听。
 */
export function useMobile(breakpoint = 768) {
    const isMobile = ref(false);

    const updateIsMobile = () => {
        isMobile.value = window.innerWidth < breakpoint;
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
