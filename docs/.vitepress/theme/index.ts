import DefaultTheme from 'vitepress/theme';
import { enhanceAppWithTabs } from 'vitepress-plugin-tabs/client'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    enhanceAppWithTabs(app)
  },
};
