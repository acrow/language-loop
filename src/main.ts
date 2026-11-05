import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n, initI18n } from './i18n';
import { storage } from './services/storage';
import { useCloudStore } from './stores/cloud';
import './styles/main.css';

// When a new service worker takes control, reload once so the app runs the
// freshly deployed bundle instead of the previously cached one. The guard on
// `controller` avoids reloading on the very first install.
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

async function bootstrap(): Promise<void> {
  const app = createApp(App);

  const pinia = createPinia();
  app.use(pinia);
  app.use(router);
  app.use(i18n);

  await initI18n();

  // Initialize the cloud store at startup so that:
  //  - the auto-sync change listeners are registered immediately, and
  //  - when auto-sync is enabled, the Firebase auth session is restored
  //    (setting `user`) before any local edits happen.
  // Previously this only happened when the cloud modal was opened, so after a
  // page reload auto-sync silently did nothing until the modal was reopened.
  // When auto-sync is disabled (e.g. the user never signed in), Firebase is
  // not loaded at all; the cloud service is loaded lazily when the modal opens.
  try {
    const cloudStore = useCloudStore(pinia);
    void cloudStore.init().catch((e) => {
      console.error('Cloud initialization failed:', e);
    });
  } catch (e) {
    console.error('Cloud store initialization failed:', e);
  }

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
