import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '@/components/ui/BaseButton.vue';

describe('BaseButton', () => {
  it('renders slot content', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Click me' } });
    expect(wrapper.text()).toContain('Click me');
  });

  it('applies the primary variant by default', () => {
    const wrapper = mount(BaseButton);
    expect(wrapper.classes()).toContain('btn-primary');
  });

  it('applies the requested variant', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'secondary' } });
    expect(wrapper.classes()).toContain('btn-secondary');
  });

  it('emits click when enabled', async () => {
    const wrapper = mount(BaseButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeUndefined();
  });

  it('shows the loading state', () => {
    const wrapper = mount(BaseButton, { props: { loading: true } });
    expect(wrapper.classes()).toContain('loading');
    expect(wrapper.attributes('disabled')).toBeDefined();
  });
});
