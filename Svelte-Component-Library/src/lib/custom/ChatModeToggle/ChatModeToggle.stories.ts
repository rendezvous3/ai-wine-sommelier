import type { Meta, StoryObj } from '@storybook/svelte';
import ChatModeToggle from './ChatModeToggle.svelte';
import ChatWidgetWithModeToggle from '../ChatWidget/ChatWidgetWithModeToggle.svelte';

const meta = {
  title: 'Custom/ChatModeToggle',
  component: ChatModeToggle as any,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        state: 'open'
      }
    }
  },
  argTypes: {
    currentMode: {
      control: 'select',
      options: ['chat', 'guided-flow']
    },
    position: {
      control: 'select',
      options: ['upper-left', 'upper-right', 'lower-left']
    },
    disabled: { control: 'boolean' },
    onclick: { action: 'clicked' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const ChatModeUpperLeft: Story = {
  args: {
    currentMode: 'chat',
    position: 'upper-left',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const GuidedFlowModeUpperLeft: Story = {
  args: {
    currentMode: 'guided-flow',
    position: 'upper-left',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const ChatModeUpperRight: Story = {
  args: {
    currentMode: 'chat',
    position: 'upper-right',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const GuidedFlowModeUpperRight: Story = {
  args: {
    currentMode: 'guided-flow',
    position: 'upper-right',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const ChatModeLowerLeft: Story = {
  args: {
    currentMode: 'chat',
    position: 'lower-left',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const GuidedFlowModeLowerLeft: Story = {
  args: {
    currentMode: 'guided-flow',
    position: 'lower-left',
    disabled: false,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const Disabled: Story = {
  args: {
    currentMode: 'chat',
    position: 'upper-left',
    disabled: true,
  },
  render: (args: any) => ({
    Component: ChatModeToggle as any,
    props: args,
  })
};

export const InChatWidget: Story = {
  render: () => ({
    Component: ChatWidgetWithModeToggle as any,
  })
};

