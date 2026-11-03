import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n, initI18n } from './i18n';
import { storage } from './services/storage';
import './styles/main.css';

async function bootstrap(): Promise<void> {
  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  app.use(i18n);

  await initI18n();

  // First-run handling: only redirect to the welcome screen on the initial
  // load of the root URL when there is no data yet. Doing this once at startup
  // (instead of in a global navigation guard) keeps the welcome screen's
  // "Start" button working, since it can always navigate to the library.
  const isRootEntry =
    window.location.pathname === '/' || window.location.pathname === import.meta.env.BASE_URL;
  await router.isReady();
  if (isRootEntry) {
    try {
      const playlists = await storage.getAllPlaylists();
      if (playlists.length === 0) {
        await router.replace({ name: 'welcome' });
      }
    } catch {
      // If storage is unavailable, keep the default route.
    }
  }

  app.mount('#app');
}

bootstrap();
