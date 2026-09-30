import { createApp } from 'vue';
import './i18n';
import './style.css';
import App from './App.vue';
import router from './router';
import 'element-plus/dist/index.css';
import 'gridstack/dist/gridstack.min.css';

createApp(App).use(router).mount('#app');
