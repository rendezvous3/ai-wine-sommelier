import type { Meta, StoryObj } from '@storybook/svelte';
import ChatMessage from './ChatMessage.svelte';
import ChatMessageTextOnly from './ChatMessageTextOnly.svelte';
import ChatMessageWithProductsCompact from './ChatMessageWithProductsCompact.svelte';
import ChatMessageUser from './ChatMessageUser.svelte';
import ChatMessageExamples from './ChatMessageExamples.svelte';

const sampleProducts = [
  {
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    title: 'Wireless Headphones',
    price: 99.99,
    rating: 4.5
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    title: 'Smart Watch',
    price: 149.99,
    originalPrice: 199.99,
    discount: 25,
    rating: 4.8
  },
  {
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    title: 'Phone Case',
    price: 29.99,
    rating: 4.2
  }
];

const meta = {
  title: 'Custom/ChatMessage',
  component: ChatMessage as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['user', 'assistant', 'system']
    },
    recommendationLayout: {
      control: 'select',
      options: ['carousel', 'compact-list', 'grid', 'bubble-grid']
    },
    productsInBubble: { control: 'boolean' },
    onAddToCart: { action: 'addToCart' },
    onAction: { action: 'action' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const TextOnly: Story = {
  render: () => ({
    Component: ChatMessageTextOnly as any,
  })
};

export const WithProductsCompact: Story = {
  render: () => ({
    Component: ChatMessageWithProductsCompact as any,
  })
};

export const UserMessage: Story = {
  render: () => ({
    Component: ChatMessageUser as any,
  })
};

export const AllExamples: Story = {
  render: () => ({
    Component: ChatMessageExamples as any,
  })
};

