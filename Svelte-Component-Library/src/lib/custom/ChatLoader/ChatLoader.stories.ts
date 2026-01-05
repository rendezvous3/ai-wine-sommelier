import type { Meta, StoryObj } from '@storybook/svelte';
import ChatLoader from './ChatLoader.svelte';
import ChatLoaderShowcase from './ChatLoaderShowcase.svelte';

const meta = {
  title: 'Custom/ChatLoader',
  component: ChatLoader as any,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['spinner', 'dots', 'pulse']
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

export const Spinner: Story = {
  args: {
    variant: 'spinner',
    size: 'md',
    color: '#3b82f6',
  },
};

export const Dots: Story = {
  args: {
    variant: 'dots',
    size: 'md',
    color: '#3b82f6',
  },
};

export const Pulse: Story = {
  args: {
    variant: 'pulse',
    size: 'md',
    color: '#3b82f6',
  },
};

export const Small: Story = {
  args: {
    variant: 'spinner',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    variant: 'spinner',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    variant: 'spinner',
    size: 'lg',
  },
};

export const CustomColor: Story = {
  args: {
    variant: 'spinner',
    size: 'md',
    color: '#10b981',
  },
};

export const AllVariants: Story = {
  render: () => ({
    Component: ChatLoaderShowcase as any,
  })
};

