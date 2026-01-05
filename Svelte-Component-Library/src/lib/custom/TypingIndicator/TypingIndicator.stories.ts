import type { Meta, StoryObj } from '@storybook/svelte';
import TypingIndicator from './TypingIndicator.svelte';

const meta = {
  title: 'Custom/TypingIndicator',
  component: TypingIndicator as any,
  tags: ['autodocs'],
  argTypes: {
    speed: {
      control: { type: 'range', min: 0.5, max: 3, step: 0.1 },
      description: 'Animation speed in seconds'
    },
    color: { control: 'color' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    speed: 1.4,
    color: '#6b7280',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    speed: 1.4,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    speed: 1.4,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    speed: 1.4,
  },
};

export const Fast: Story = {
  args: {
    speed: 0.8,
    size: 'md',
  },
};

export const Slow: Story = {
  args: {
    speed: 2.5,
    size: 'md',
  },
};

export const CustomColor: Story = {
  args: {
    color: '#3b82f6',
    size: 'md',
    speed: 1.4,
  },
};

export const InChatBubble: Story = {
  render: () => ({
    Component: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 300px;">
        <div style="background: #f3f4f6; border-radius: 18px; padding: 12px 16px; margin-right: auto; border-bottom-left-radius: 4px;">
          <TypingIndicator speed={1.4} color="#6b7280" size="md" />
        </div>
      </div>
    ` as any,
  })
};

