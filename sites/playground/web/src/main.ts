import { createApp } from 'vue';
import { initializeMaterials } from './setup-materials';
import './style.css';
import App from './App.vue';
import 'gridstack/dist/gridstack.min.css';

initializeMaterials();

createApp(App).mount('#app');
