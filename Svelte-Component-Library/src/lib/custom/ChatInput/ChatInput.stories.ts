import type { Meta, StoryObj } from '@storybook/svelte';
import ChatInput from './ChatInput.svelte';

const meta = {
  title: 'Custom/ChatInput',
  component: ChatInput as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    }
  },
  argTypes: {
    placeholder: { control: 'text' },
    maxLength: { control: 'number' },
    disabled: { control: 'boolean' },
    variant: {
      control: 'select',
      options: ['default', 'compact', 'two-line']
    },
    showVoice: { control: 'boolean' },
    showAttach: { control: 'boolean' },
    showEmoji: { control: 'boolean' },
    showSend: { control: 'boolean' },
    showFormatting: { control: 'boolean' },
    showMentions: { control: 'boolean' },
    showAgent: { control: 'boolean' },
    showModel: { control: 'boolean' },
    showTemperature: { control: 'boolean' },
    showSpeed: { control: 'boolean' },
    oninput: { action: 'input' },
    onsend: { action: 'send' },
    onvoice: { action: 'voice' },
    onattach: { action: 'attach' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    placeholder: 'Type a message...',
    showVoice: true,
    showAttach: true,
    showEmoji: true,
    showSend: true,
  },
};

export const Compact: Story = {
  args: {
    variant: 'compact',
    placeholder: 'Type a message...',
  },
};

export const TwoLine: Story = {
  args: {
    variant: 'two-line',
    placeholder: 'Ask anything...',
    showVoice: true,
    showAttach: true,
    showEmoji: true,
    showFormatting: true,
    showAgent: true,
    showModel: true,
    showTemperature: true,
    showSpeed: true,
    showSend: true,
  },
};

export const TwoLineMinimal: Story = {
  args: {
    variant: 'two-line',
    placeholder: 'What can I help with?',
    showAttach: true,
    showVoice: true,
    showSend: true,
    showAgent: false,
    showModel: false,
    showTemperature: false,
    showSpeed: false,
    showEmoji: false,
    showFormatting: false,
  },
};

export const TwoLineWithDropdowns: Story = {
  args: {
    variant: 'two-line',
    placeholder: 'Type your message...',
    showAgent: true,
    showModel: true,
    showTemperature: true,
    showSpeed: false,
    showAttach: true,
    showEmoji: true,
    showVoice: true,
    showSend: true,
    showFormatting: false,
  },
};

export const TwoLineFullFeatures: Story = {
  args: {
    variant: 'two-line',
    placeholder: 'Ask anything...',
    showAgent: true,
    showModel: true,
    showTemperature: true,
    showSpeed: true,
    showAttach: true,
    showEmoji: true,
    showVoice: true,
    showFormatting: true,
    showSend: true,
  },
};

export const WithMaxLength: Story = {
  args: {
    placeholder: 'Type a message...',
    maxLength: 100,
  },
};

export const Minimal: Story = {
  args: {
    placeholder: 'Type a message...',
    showVoice: false,
    showAttach: false,
    showEmoji: false,
    showSend: true,
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Type a message...',
    disabled: true,
  },
};

