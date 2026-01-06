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
import ChatMessageWithProductsCompactInWidget from './ChatMessageWithProductsCompactInWidget.svelte';
import ChatMessageWithProductsCompactInWindow from './ChatMessageWithProductsCompactInWindow.svelte';
import ChatMessageWithProductsHoverInWidget from './ChatMessageWithProductsHoverInWidget.svelte';
import ChatMessageWithProductsHoverInWindow from './ChatMessageWithProductsHoverInWindow.svelte';
import ChatMessageWithProductsNoHoverInWidget from './ChatMessageWithProductsNoHoverInWidget.svelte';
import ChatMessageWithProductsNoHoverInWindow from './ChatMessageWithProductsNoHoverInWindow.svelte';
import ChatWidgetDecorator from '../ChatWidget/ChatWidgetDecorator.svelte';

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

export const WithProductsCompact: Story = {
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

// Stories in ChatWidget context
export const WithProductsCompactInWidget: Story = {
  render: () => ({
    Component: ChatMessageWithProductsCompactInWidget as any,
  }),
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

export const WithProductsHoverEnabledInWidget: Story = {
  render: () => ({
    Component: ChatMessageWithProductsHoverInWidget as any,
  }),
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

export const WithProductsHoverDisabledInWidget: Story = {
  render: () => ({
    Component: ChatMessageWithProductsNoHoverInWidget as any,
  }),
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

// Stories in ChatWindow context
export const WithProductsCompactInWindow: Story = {
  render: () => ({
    Component: ChatMessageWithProductsCompactInWindow as any,
  }),
};

export const WithProductsHoverEnabledInWindow: Story = {
  render: () => ({
    Component: ChatMessageWithProductsHoverInWindow as any,
  }),
};

export const WithProductsHoverDisabledInWindow: Story = {
  render: () => ({
    Component: ChatMessageWithProductsNoHoverInWindow as any,
  }),
};
