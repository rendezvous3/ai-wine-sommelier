import type { Meta, StoryObj } from '@storybook/svelte';
import ChatBubble from './ChatBubble.svelte';
import ChatBubbleRichContent from './ChatBubbleRichContent.svelte';
import ChatBubbleUser from './ChatBubbleUser.svelte';
import ChatBubbleAssistant from './ChatBubbleAssistant.svelte';
import ChatBubbleSystem from './ChatBubbleSystem.svelte';
import ChatBubbleExpandable from './ChatBubbleExpandable.svelte';
import ChatBubbleExpanded from './ChatBubbleExpanded.svelte';

const meta = {
  title: 'Custom/ChatBubble',
  component: ChatBubble as any,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['user', 'assistant', 'system']
    },
    sender: { control: 'text' },
    timestamp: { control: 'text' },
    expanded: { control: 'boolean' },
    expandable: { control: 'boolean' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const User: Story = {
  render: () => ({
    Component: ChatBubbleUser as any,
  })
};

export const Assistant: Story = {
  render: () => ({
    Component: ChatBubbleAssistant as any,
  })
};

export const System: Story = {
  render: () => ({
    Component: ChatBubbleSystem as any,
  })
};

export const Expandable: Story = {
  render: () => ({
    Component: ChatBubbleExpandable as any,
  })
};

export const Expanded: Story = {
  render: () => ({
    Component: ChatBubbleExpanded as any,
  })
};

export const WithRichContent: Story = {
  render: () => ({
    Component: ChatBubbleRichContent as any,
  })
};

