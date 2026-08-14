import { createRouter, createWebHistory } from 'vue-router';
import { ChatView, BuilderView } from '../views';
import { PlaygroundMode } from '../constants';

const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: `/${PlaygroundMode.Chat}`,
    },
    {
      path: `/${PlaygroundMode.Chat}`,
      name: PlaygroundMode.Chat,
      component: ChatView,
    },
    {
      path: `/${PlaygroundMode.Builder}`,
      name: PlaygroundMode.Builder,
      component: BuilderView,
      beforeEnter: (to, _from, next) => {
        if (!ENABLE_TEMPLATE) {
          next({ name: PlaygroundMode.Chat, query: to.query });
          return;
        }
        next();
      },
    },
  ],
});

export default router;
