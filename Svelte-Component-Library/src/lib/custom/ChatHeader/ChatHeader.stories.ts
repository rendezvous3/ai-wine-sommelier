import type { Meta, StoryObj } from '@storybook/svelte';
import ChatHeader from './ChatHeader.svelte';
import ChatHeaderAllStyles from './ChatHeaderAllStyles.svelte';

const meta = {
  title: 'Custom/ChatHeader',
  component: ChatHeader as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    },
    layout: 'padded'
  },
  argTypes: {
    title: { control: 'text' },
    style: {
      control: 'select',
      options: ['flat', 'wavy', 'glass', 'minimal', 'none']
    },
    darkMode: { control: 'boolean' },
    onClose: { action: 'closed' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Flat: Story = {
  args: {
    title: 'Chat Support',
    style: 'flat',
    darkMode: false,
  },
};

export const Wavy: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: false,
  },
};

export const Glass: Story = {
  args: {
    title: 'Chat Support',
    style: 'glass',
    darkMode: false,
  },
};

export const Minimal: Story = {
  args: {
    title: 'Chat Support',
    style: 'minimal',
    darkMode: false,
  },
};

export const None: Story = {
  args: {
    title: 'Chat Support',
    style: 'none',
    darkMode: false,
  },
};

export const DarkMode: Story = {
  args: {
    title: 'Chat Support',
    style: 'wavy',
    darkMode: true,
  },
  render: (args) => ({
    Component: ChatHeader as any,
    props: args,
  }),
  decorators: [
    () => ({
      Component: 'div',
      props: {
        style: 'background: #1f2937; padding: 20px; border-radius: 8px;'
      }
    })
  ]
};

export const AllStyles: Story = {
  render: () => ({
    Component: ChatHeaderAllStyles as any,
  })
};

