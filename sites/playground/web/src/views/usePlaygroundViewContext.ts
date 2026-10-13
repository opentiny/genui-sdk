import { inject } from 'vue';

export function usePlaygroundViewContext() {
  const playgroundContext = inject('playgroundContext');
  if (!playgroundContext) {
    throw new Error('playgroundContext is not provided');
  }
  return playgroundContext;
}
