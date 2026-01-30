import type { Meta, StoryObj } from '@storybook/svelte';
import ShimmerText from './ShimmerText.svelte';
import ShimmerTextShowcase from './ShimmerTextShowcase.svelte';

const meta = {
  title: 'Custom/ShimmerText',
  component: ShimmerText,
  tags: ['autodocs'],
  argTypes: {
    text: {
      control: 'text',
      description: 'The text to display with shimmer effect'
    },
    speed: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.1 },
      description: 'Animation speed in seconds'
    },
    baseColor: {
      control: 'color',
      description: 'Base text color'
    },
    highlightColor: {
      control: 'color',
      description: 'Highlight color for shimmer effect'
    },
    fontSize: {
      control: 'text',
      description: 'Font size (CSS value)'
    }
  }
} satisfies Meta<ShimmerText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Showcase: Story = {
  render: () => ({
    Component: ShimmerTextShowcase as any
  })
};

export const Default: Story = {
  args: {
    text: 'Looking for best matches...',
    speed: 1.5,
    baseColor: '#6b7280',
    highlightColor: '#ffffff'
  }
};

export const Fast: Story = {
  args: {
    text: 'Loading fast...',
    speed: 0.8,
    baseColor: '#6b7280',
    highlightColor: '#ffffff'
  }
};

export const Slow: Story = {
  args: {
    text: 'Looking for best matches...',
    speed: 2.5,
    baseColor: '#8b8b8b',
    highlightColor: '#e0e0e0',
    fontSize: '0.875rem'
  }
};

export const ColorfulShimmer: Story = {
  args: {
    text: 'Colorful shimmer effect!',
    speed: 1.5,
    baseColor: '#8b5cf6',
    highlightColor: '#fbbf24'
  }
};

export const GoldShimmer: Story = {
  args: {
    text: 'Premium gold shimmer',
    speed: 1.5,
    baseColor: '#92400e',
    highlightColor: '#fcd34d'
  }
};

export const LongText: Story = {
  args: {
    text: 'This is a longer text to demonstrate the shimmer effect across multiple words and see how it looks',
    speed: 2,
    baseColor: '#6b7280',
    highlightColor: '#ffffff'
  }
};
