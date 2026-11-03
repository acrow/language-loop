import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '@/components/ui/BaseModal.vue';

describe('BaseModal', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(BaseModal, { props: { open: false } });
    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('renders the title and slot when open', () => {
    const wrapper = mount(BaseModal, {
      props: { open: true, title: 'Hello' },
      slots: { default: '<p>Body</p>' }
    });
    expect(wrapper.text()).toContain('Hello');
    expect(wrapper.text()).toContain('Body');
  });

  it('emits close on the close button', async () => {
    const wrapper = mount(BaseModal, { props: { open: true, title: 'X' } });
    await wrapper.find('button[aria-label="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close on Escape', async () => {
    const wrapper = mount(BaseModal, { props: { open: true, title: 'X' } });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
