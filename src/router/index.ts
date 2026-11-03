import { createRouter, createWebHistory } from 'vue-router';
import WelcomeView from '@/views/WelcomeView.vue';
import { storage } from '@/services/storage';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/library' },
    { path: '/welcome', name: 'welcome', component: WelcomeView },
    {
      path: '/library',
      name: 'library',
      component: () => import('@/views/LibraryView.vue')
    },
    {
      path: '/player/:id',
      name: 'player',
      component: () => import('@/views/PlayerView.vue')
    },
    {
      path: '/test/:id',
      name: 'test',
      component: () => import('@/views/TestView.vue')
    }
  ]
});

// On the first load, show the welcome/home page only when there are no playlists.
let bootstrapped = false;
router.beforeEach(async (to) => {
  if (bootstrapped) return true;
  bootstrapped = true;

  if (to.path === '/library' || to.path === '/') {
    const playlists = await storage.getAllPlaylists();
    if (playlists.length === 0) return '/welcome';
  }
  return true;
});

export default router;
