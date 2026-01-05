import type { Meta, StoryObj } from '@storybook/svelte';
import Checkbox from './Checkbox.svelte';
import CheckboxVariants from './CheckboxVariants.svelte';
import CheckboxInteractive from './CheckboxInteractive.svelte';
import CheckboxChecked from './CheckboxChecked.svelte';
import CheckboxIndeterminateExample from './CheckboxIndeterminateExample.svelte';
import CheckboxWithLabel from './CheckboxWithLabel.svelte';
import CheckboxWithDescription from './CheckboxWithDescription.svelte';
import CheckboxRequired from './CheckboxRequired.svelte';
import CheckboxError from './CheckboxError.svelte';
import CheckboxSuccess from './CheckboxSuccess.svelte';

const meta = {
  title: 'Custom/Checkbox',
  component: Checkbox as any,
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
    description: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'error', 'success']
    },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    onchange: { action: 'changed' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

// Basic states - Interactive
export const Unchecked: Story = {
  render: () => ({
    Component: CheckboxInteractive as any,
  })
};

export const Checked: Story = {
  render: () => ({
    Component: CheckboxChecked as any,
  })
};

export const Indeterminate: Story = {
  render: () => ({
    Component: CheckboxIndeterminateExample as any,
  })
};

// With label - Interactive
export const WithLabel: Story = {
  render: () => ({
    Component: CheckboxWithLabel as any,
  })
};

export const WithDescription: Story = {
  render: () => ({
    Component: CheckboxWithDescription as any,
  })
};

export const Required: Story = {
  render: () => ({
    Component: CheckboxRequired as any,
  })
};

// Variants - Interactive
export const Error: Story = {
  render: () => ({
    Component: CheckboxError as any,
  })
};

export const Success: Story = {
  render: () => ({
    Component: CheckboxSuccess as any,
  })
};

// Disabled states
export const DisabledUnchecked: Story = {
  args: {
    checked: false,
    label: 'Disabled checkbox',
    disabled: true,
    variant: 'default',
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    label: 'Disabled checked checkbox',
    disabled: true,
    variant: 'default',
  },
};

// Grid showcase
export const AllVariants: Story = {
  render: () => ({
    Component: CheckboxVariants as any,
  })
};

