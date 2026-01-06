import type { Meta, StoryObj } from '@storybook/svelte';
import ChatMessage from './ChatMessage.svelte';
import ChatMessageUser from './ChatMessageUser.svelte';
import ChatMessageTextOnly from './ChatMessageTextOnly.svelte';
import ChatMessageSystem from './ChatMessageSystem.svelte';
import ChatMessageWithProductsCompact from './ChatMessageWithProductsCompact.svelte';
import ChatMessageWithHover from './ChatMessageWithHover.svelte';
import ChatMessageWithoutHover from './ChatMessageWithoutHover.svelte';
import ChatMessageUserWithHover from './ChatMessageUserWithHover.svelte';
import ChatMessageUserWithoutHover from './ChatMessageUserWithoutHover.svelte';
import ChatMessageWithProductsHover from './ChatMessageWithProductsHover.svelte';
import ChatMessageWithProductsNoHover from './ChatMessageWithProductsNoHover.svelte';

const meta = {
  title: 'Custom/ChatMessage',
  component: ChatMessage as any,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['user', 'assistant', 'system']
    },
    sender: { control: 'text' },
    timestamp: { control: 'text' },
    showHoverActions: { control: 'boolean' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const User: Story = {
  render: () => ({
    Component: ChatMessageUser as any,
  })
};

export const Assistant: Story = {
  render: () => ({
    Component: ChatMessageTextOnly as any,
  })
};

export const System: Story = {
  render: () => ({
    Component: ChatMessageSystem as any,
  })
};

export const WithHoverActions: Story = {
  render: () => ({
    Component: ChatMessageWithHover as any,
  })
};

export const WithoutHoverActions: Story = {
  render: () => ({
    Component: ChatMessageWithoutHover as any,
  })
};

export const UserWithHoverActions: Story = {
  render: () => ({
    Component: ChatMessageUserWithHover as any,
  })
};

export const UserWithoutHoverActions: Story = {
  render: () => ({
    Component: ChatMessageUserWithoutHover as any,
  })
};

export const WithProducts: Story = {
  render: () => ({
    Component: ChatMessageWithProductsCompact as any,
  })
};

export const WithProductsHoverEnabled: Story = {
  render: () => ({
    Component: ChatMessageWithProductsHover as any,
  })
};

export const WithProductsHoverDisabled: Story = {
  render: () => ({
    Component: ChatMessageWithProductsNoHover as any,
  })
};
