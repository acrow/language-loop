import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PlaylistCard from '@/components/playlist/PlaylistCard.vue';
import { i18n } from '@/i18n';
import type { Playlist } from '@/types/models';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}));

const playlist: Playlist = {
  id: 1,
  cloudId: 'c1',
  version: 1,
  name: 'Test Playlist',
  icon: '📚',
  description: 'A description',
  targetLang: 'en-US',
  nativeLang: 'zh-CN',
  groupId: null,
  createdAt: 0,
  lastPlayedAt: null,
  settings: {
    repeatCount: 2,
    pauseDuration: 1,
    speechRate: 1,
    preferredVoice: '',
    speakNative: false
  }
};

describe('PlaylistCard', () => {
  it('renders the playlist name and sentence count', () => {
    const wrapper = mount(PlaylistCard, {
      props: { playlist, sentenceCount: 3 },
      global: { plugins: [i18n] }
    });
    expect(wrapper.text()).toContain('Test Playlist');
    expect(wrapper.text()).toContain('3 sentences');
  });

  it('navigates to the player on click', async () => {
    const wrapper = mount(PlaylistCard, {
      props: { playlist, sentenceCount: 0 },
      global: { plugins: [i18n] }
    });
    await wrapper.trigger('click');
    expect(push).toHaveBeenCalledWith({ name: 'player', params: { id: 1 } });
  });
});
