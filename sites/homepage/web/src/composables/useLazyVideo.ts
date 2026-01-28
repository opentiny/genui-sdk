import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';

export function useLazyVideo(videoRef: Ref<HTMLVideoElement | null>, videoSource: string, rootMargin = '100px') {
  const videoSrc = ref<string | null>(null);
  const shouldLoad = ref(false);
  let observer: IntersectionObserver | null = null;

  onMounted(() => {
    if (!videoRef.value) return;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad.value) {
            shouldLoad.value = true;
            if (observer) {
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        rootMargin,
      }
    );

    observer.observe(videoRef.value);
  });

  onUnmounted(() => {
    if (observer && videoRef.value) {
      observer.unobserve(videoRef.value);
      observer.disconnect();
    }
  });

  watch(shouldLoad, (newValue) => {
    if (newValue) {
      videoSrc.value = videoSource;
    }
  });

  return {
    videoSrc,
    shouldLoad,
  };
}

