import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import GroupCard from '@/components/playlist/GroupCard.vue';
import { i18n } from '@/i18n';
import type { Group } from '@/types/models';

const group: Group = {
  id: 1,
  cloudId: 'group_1',
  name: 'Test Group',
  icon: '📁',
  color: null,
  order: 0,
  createdAt: 0
};

function mountCard() {
  return mount(GroupCard, {
    props: { group, playlists: [], counts: {} },
    global: { plugins: [i18n] }
  });
}

describe('GroupCard collapse persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts expanded by default', () => {
    const wrapper = mountCard();
    expect(wrapper.text()).toContain('Drop playlists here');
  });

  it('persists collapsed state across remounts', async () => {
    const wrapper = mountCard();
    await wrapper.find('header').trigger('click');

    // State is written to localStorage, not the group record.
    const stored = JSON.parse(localStorage.getItem('language-loop:collapsed-groups') || '{}');
    expect(stored['1']).toBe(true);

    wrapper.unmount();

    // Remounting (as happens when navigating away and back) restores the state.
    const remounted = mountCard();
    expect(remounted.text()).not.toContain('Drop playlists here');
  });

  it('expands again when toggled back', async () => {
    const wrapper = mountCard();
    await wrapper.find('header').trigger('click');
    await wrapper.find('header').trigger('click');

    const stored = JSON.parse(localStorage.getItem('language-loop:collapsed-groups') || '{}');
    expect(stored['1']).toBe(false);
    expect(wrapper.text()).toContain('Drop playlists here');
  });
});
