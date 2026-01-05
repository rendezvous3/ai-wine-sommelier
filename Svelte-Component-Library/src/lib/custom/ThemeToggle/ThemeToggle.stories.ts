import type { Meta, StoryObj } from '@storybook/svelte';
import ThemeToggle from './ThemeToggle.svelte';

const meta = {
  title: 'Custom/ThemeToggle',
  component: ThemeToggle as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    }
  },
  argTypes: {
    darkMode: { control: 'boolean' },
    onToggle: { action: 'toggled' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    darkMode: false,
  },
};

export const DarkMode: Story = {
  args: {
    darkMode: true,
  },
};

