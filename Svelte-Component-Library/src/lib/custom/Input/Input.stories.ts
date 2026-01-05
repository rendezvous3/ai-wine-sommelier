import type { Meta, StoryObj } from '@storybook/svelte';
import Input from './Input.svelte';
import InputVariants from './InputVariants.svelte';
import InputSizes from './InputSizes.svelte';

const meta = {
  title: 'Custom/Input',
  component: Input as any,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    helperText: { control: 'text' },
    variant: {
      control: 'select',
      options: ['default', 'error', 'success']
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg']
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url']
    },
    fullWidth: { control: 'boolean' },
    required: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    oninput: { action: 'input' },
    onblur: { action: 'blur' },
    onfocus: { action: 'focus' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

// Basic examples
export const Default: Story = {
  args: {
    value: '',
    placeholder: 'Enter text...',
    variant: 'default',
    size: 'md',
  },
};

export const WithLabel: Story = {
  args: {
    value: '',
    label: 'Email Address',
    placeholder: 'you@example.com',
    variant: 'default',
    size: 'md',
  },
};

export const WithHelperText: Story = {
  args: {
    value: '',
    label: 'Password',
    placeholder: 'Enter your password',
    helperText: 'Must be at least 8 characters',
    variant: 'default',
    size: 'md',
  },
};

export const Required: Story = {
  args: {
    value: '',
    label: 'Full Name',
    placeholder: 'John Doe',
    required: true,
    variant: 'default',
    size: 'md',
  },
};

// Variant showcase
export const Error: Story = {
  args: {
    value: 'invalid@email',
    label: 'Email',
    placeholder: 'you@example.com',
    helperText: 'Please enter a valid email address',
    variant: 'error',
    size: 'md',
  },
};

export const Success: Story = {
  args: {
    value: 'user@example.com',
    label: 'Email',
    placeholder: 'you@example.com',
    helperText: 'Email address is valid',
    variant: 'success',
    size: 'md',
  },
};

// Size showcase
export const Small: Story = {
  args: {
    value: '',
    label: 'Small Input',
    placeholder: 'Small size',
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    value: '',
    label: 'Medium Input',
    placeholder: 'Medium size',
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    value: '',
    label: 'Large Input',
    placeholder: 'Large size',
    size: 'lg',
  },
};

// State showcase
export const Disabled: Story = {
  args: {
    value: 'Disabled value',
    label: 'Disabled Input',
    placeholder: 'Cannot edit',
    disabled: true,
    size: 'md',
  },
};

export const Readonly: Story = {
  args: {
    value: 'Read-only value',
    label: 'Read-only Input',
    readonly: true,
    size: 'md',
  },
};

export const FullWidth: Story = {
  args: {
    value: '',
    label: 'Full Width Input',
    placeholder: 'Takes full container width',
    fullWidth: true,
    size: 'md',
  },
};

// Input type examples
export const Email: Story = {
  args: {
    value: '',
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    helperText: 'Enter a valid email address',
    size: 'md',
    required: true,
  },
};

export const Password: Story = {
  args: {
    value: '',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
    helperText: 'Must be at least 8 characters',
    size: 'md',
    required: true,
  },
};

export const Number: Story = {
  args: {
    value: '',
    label: 'Age',
    type: 'number',
    placeholder: 'Enter your age',
    size: 'md',
  },
};

// Grid showcases
export const AllVariants: Story = {
  render: () => ({
    Component: InputVariants as any,
  })
};

export const AllSizes: Story = {
  render: () => ({
    Component: InputSizes as any,
  })
};

// Note: Icon examples require actual icon components to be passed as snippet slots
// Example usage:
// <Input value={value} label="Search" placeholder="Search...">
//   {#snippet iconLeft()}
//     <IconSearch />
//   {/snippet}
// </Input>
//
// For Storybook, icons would need to be imported and passed in the render function
// These stories show the structure but icons are not rendered in Storybook controls

