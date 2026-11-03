import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SentenceItem from '@/components/player/SentenceItem.vue';
import type { Sentence } from '@/types/models';

const sentence: Sentence = {
  id: 1,
  playlistId: 1,
  targetText: 'Hello',
  nativeText: '你好',
  memo: '',
  targetLang: 'en-US',
  nativeLang: 'zh-CN',
  customAudio: null,
  order: 0
};

describe('SentenceItem', () => {
  it('renders the sentence text', () => {
    const wrapper = mount(SentenceItem, {
      props: { sentence, index: 0, active: false, playing: false }
    });
    expect(wrapper.text()).toContain('Hello');
    expect(wrapper.text()).toContain('你好');
  });

  it('emits play when the content is clicked', async () => {
    const wrapper = mount(SentenceItem, {
      props: { sentence, index: 0, active: false, playing: false }
    });
    await wrapper.find('.cursor-pointer').trigger('click');
    expect(wrapper.emitted('play')).toEqual([[0]]);
  });

  it('emits edit when Edit is clicked', async () => {
    const wrapper = mount(SentenceItem, {
      props: { sentence, index: 0, active: false, playing: false }
    });
    const buttons = wrapper.findAll('button');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('edit')).toHaveLength(1);
  });
});
