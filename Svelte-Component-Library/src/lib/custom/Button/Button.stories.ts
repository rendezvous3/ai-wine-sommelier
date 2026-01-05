import type { Meta, StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';
import ButtonGrid from './ButtonGrid.svelte';
import ButtonSizes from './ButtonSizes.svelte';

const meta = {
  title: 'Custom/Button',
  component: Button as any,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'success', 'ghost', 'outline']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
    onclick: { action: 'clicked' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

// Variant showcase
export const Primary: Story = {
  args: {
    label: 'Primary Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Secondary Button',
    variant: 'secondary',
    size: 'md',
  },
};

export const Danger: Story = {
  args: {
    label: 'Danger Button',
    variant: 'danger',
    size: 'md',
  },
};

export const Success: Story = {
  args: {
    label: 'Success Button',
    variant: 'success',
    size: 'md',
  },
};

export const Ghost: Story = {
  args: {
    label: 'Ghost Button',
    variant: 'ghost',
    size: 'md',
  },
};

export const Outline: Story = {
  args: {
    label: 'Outline Button',
    variant: 'outline',
    size: 'md',
  },
};

// Size showcase
export const Small: Story = {
  args: {
    label: 'Small Button',
    variant: 'primary',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    label: 'Medium Button',
    variant: 'primary',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    label: 'Large Button',
    variant: 'primary',
    size: 'lg',
  },
};

// State showcase
export const Disabled: Story = {
  args: {
    label: 'Disabled Button',
    variant: 'primary',
    size: 'md',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    label: 'Loading Button',
    variant: 'primary',
    size: 'md',
    loading: true,
  },
};

export const FullWidth: Story = {
  args: {
    label: 'Full Width Button',
    variant: 'primary',
    size: 'md',
    fullWidth: true,
  },
};

// Grid showcases
export const AllVariants: Story = {
  render: () => ({
    Component: ButtonGrid as any,
  })
};

export const AllSizes: Story = {
  render: () => ({
    Component: ButtonSizes as any,
  })
};
