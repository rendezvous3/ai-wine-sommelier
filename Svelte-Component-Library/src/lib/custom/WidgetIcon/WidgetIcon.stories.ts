import type { Meta, StoryObj } from '@storybook/svelte';
import WidgetIcon from './WidgetIcon.svelte';
import WidgetIconShowcase from './WidgetIconShowcase.svelte';

const meta = {
  title: 'Custom/WidgetIcon',
  component: WidgetIcon as any,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['chat-window', 'support-ticket', 'shopping-cart', 'message-bubble']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    color: { control: 'color' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const ChatWindow: Story = {
  args: {
    type: 'chat-window',
    size: 'md',
  },
};

export const SupportTicket: Story = {
  args: {
    type: 'support-ticket',
    size: 'md',
  },
};

export const ShoppingCart: Story = {
  args: {
    type: 'shopping-cart',
    size: 'md',
  },
};

export const MessageBubble: Story = {
  args: {
    type: 'message-bubble',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    type: 'chat-window',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    type: 'chat-window',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    type: 'chat-window',
    size: 'lg',
  },
};

export const CustomColor: Story = {
  args: {
    type: 'shopping-cart',
    size: 'md',
    color: '#3b82f6',
  },
};

export const AllVariants: Story = {
  render: () => ({
    Component: WidgetIconShowcase as any,
  })
};

