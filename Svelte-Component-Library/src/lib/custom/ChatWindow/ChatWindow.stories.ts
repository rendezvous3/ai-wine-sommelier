import type { Meta, StoryObj } from '@storybook/svelte';
import ChatWindow from './ChatWindow.svelte';
import ChatWindowWithMessages from './ChatWindowWithMessages.svelte';
import ChatWindowWithSubheader from './ChatWindowWithSubheader.svelte';
import ChatWindowExpandIcons from './ChatWindowExpandIcons.svelte';
import ChatWindowClearButtonIcons from './ChatWindowClearButtonIcons.svelte';

const meta = {
  title: 'Custom/ChatWindow',
  component: ChatWindow as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    },
    layout: 'fullscreen'
  },
  argTypes: {
    expanded: { control: 'boolean' },
    showScrollButton: { control: 'boolean' },
    expandIcon: {
      control: 'select',
      options: ['grid', 'arrows', 'maximize', 'chevrons', 'plus-minus', 'corner', 'diagonal', 'dots', 'lines', 'square']
    },
    onExpand: { action: 'expand' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
};

export const WithMessages: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
  render: (args: any) => ({
    Component: ChatWindowWithMessages as any,
    props: args,
  })
};

export const Expanded: Story = {
  args: {
    expanded: true,
    showScrollButton: true,
  },
};

export const WithSubheader: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
  render: (args: any) => ({
    Component: ChatWindowWithSubheader as any,
    props: args,
  })
};

export const ExpandIconArrows: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'arrows',
  },
};

export const ExpandIconMaximize: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'maximize',
  },
};

export const ExpandIconChevrons: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'chevrons',
  },
};

export const ExpandIconCorner: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'corner',
  },
};

export const ExpandIconDiagonal: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'diagonal',
  },
};

export const ExpandIconDots: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'dots',
  },
};

export const ExpandIconLines: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'lines',
  },
};

export const ExpandIconSquare: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    expandIcon: 'square',
  },
};

export const AllExpandIcons: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
  },
  render: (args: any) => ({
    Component: ChatWindowExpandIcons as any,
    props: args,
  })
};

export const ClearButtonIcons: Story = {
  args: {
    expanded: false,
    showScrollButton: true,
    hasMessages: true,
    clearButtonIcon: 'trash',
  },
  render: (args: any) => ({
    Component: ChatWindowClearButtonIcons as any,
    props: args,
  })
};

