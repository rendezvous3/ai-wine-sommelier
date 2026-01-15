import type { Meta, StoryObj } from '@storybook/svelte';
import GuidedFlow from './GuidedFlow.svelte';
import type { GuidedFlowConfig } from './types.js';
import ChatWidgetWithGuidedFlow from '../ChatWidget/ChatWidgetWithGuidedFlow.svelte';

const meta = {
  title: 'Custom/GuidedFlow',
  component: GuidedFlow as any,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        state: 'open'
      }
    }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

const sampleSteps = [
  {
    id: 'category',
    title: 'What product type are you interested in?',
    subtitle: '(Select one)',
    type: 'single-select' as const,
    required: true,
    options: [
      {
        id: 'flower',
        label: 'Flower',
        value: 'flower',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 10 15 5 10 10C10 15 15 20 20 25C25 20 30 15 30 10C25 5 20 10 20 10Z" fill="#3b82f6" opacity="0.3"/><path d="M20 8C20 8 14 2 8 8C8 14 14 20 20 28C26 20 32 14 32 8C26 2 20 8 20 8Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'prerolls',
        label: 'Prerolls',
        value: 'prerolls',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="16" height="4" rx="2" fill="#3b82f6"/><circle cx="20" cy="20" r="2" fill="#3b82f6"/></svg>'
      },
      {
        id: 'vape-cart',
        label: 'Vape Cart',
        value: 'vaporizers',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="8" height="20" rx="1" stroke="#3b82f6" stroke-width="2"/><path d="M18 12H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
        {
          id: 'edible',
          label: 'Edible',
          value: 'edibles',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="16" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M14 18H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'concentrates',
          label: 'Concentrates',
          value: 'concentrates',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 16L24 24M24 16L16 24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
        }
    ]
  },
  {
    id: 'effects',
    title: 'How would you like to feel?',
    subtitle: '(Up to 2)',
    type: 'multi-select' as const,
    maxSelections: 2,
    required: true,
    options: [
      {
        id: 'calm',
        label: 'Calm',
        value: 'calm',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'creative',
        label: 'Creative',
        value: 'creative',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'energized',
        label: 'Energized',
        value: 'energized',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 8L24 16L32 18L26 24L28 32L20 28L12 32L14 24L8 18L16 16L20 8Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'euphoric',
        label: 'Euphoric',
        value: 'euphoric',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12L22 18L28 20L22 22L20 28L18 22L12 20L18 18L20 12Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'focused',
        label: 'Focused',
        value: 'focused',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" stroke="#3b82f6" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="#3b82f6"/></svg>'
      },
      {
        id: 'relaxed',
        label: 'Relaxed',
        value: 'relaxed',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 24C12 24 16 20 20 24C24 20 28 24 28 24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/></svg>'
      },
      {
        id: 'sedated',
        label: 'Sedated',
        value: 'sedated',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M14 20H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'sleepy',
        label: 'Sleepy',
        value: 'sleepy',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20C16 20 18 22 20 22C22 22 24 20 24 20" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/><path d="M14 16L16 18M24 16L26 18" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'stimulated',
        label: 'Stimulated',
        value: 'stimulated',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'uplifted',
        label: 'Uplifted',
        value: 'uplifted',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12L24 20L32 22L26 28L28 36L20 32L12 36L14 28L8 22L16 20L20 12Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    ]
  },
  {
    id: 'thc-percentage',
    title: 'How potent would you like it?',
    subtitle: '(Select one)',
    type: 'single-select' as const,
    required: true,
    options: [
      {
        id: 'mild',
        label: 'Mild',
        value: 'mild',
        description: '<13%',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="20" height="4" rx="2" fill="#3b82f6"/></svg>'
      },
      {
        id: 'balanced',
        label: 'Balanced',
        value: 'balanced',
        description: '13-18%',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="16" width="20" height="8" rx="2" fill="#3b82f6"/></svg>'
      },
      {
        id: 'moderate',
        label: 'Moderate',
        value: 'moderate',
        description: '18-22%',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" fill="#3b82f6"/></svg>'
      },
      {
        id: 'strong',
        label: 'Strong',
        value: 'strong',
        description: '22-28%',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="12" width="20" height="16" rx="2" fill="#3b82f6"/></svg>'
      },
      {
        id: 'very-strong',
        label: 'Very Strong',
        value: 'very-strong',
        description: '>28%',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" rx="2" fill="#3b82f6"/></svg>'
      }
    ]
  },
  {
    id: 'price',
    title: 'What price are you looking for each product?',
    subtitle: '(Select one)',
    type: 'single-select' as const,
    required: true,
    options: [
      {
        id: 'no-preference',
        label: 'No Preference',
        value: null,
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="#3b82f6" stroke-width="2"/><path d="M16 20H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'low',
        label: '$0-25',
        value: { price_min: 0, price_max: 25 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'medium',
        label: '$25-50',
        value: { price_min: 25, price_max: 50 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'high',
        label: '$50-75',
        value: { price_min: 50, price_max: 75 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'premium',
        label: '$75+',
        value: { price_min: 75, price_max: null },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24M18 24H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    ]
  }
];

export const Default: Story = {
  args: {
    config: {
      steps: sampleSteps,
      onComplete: (selections: Record<string, any>) => {
        console.log('Flow completed:', selections);
      },
      onClose: () => {
        console.log('Flow closed');
      }
    }
  },
  render: (args: any) => ({
    Component: GuidedFlow as any,
    props: args,
  })
};

export const SingleSelect: Story = {
  args: {
    config: {
      steps: [sampleSteps[0]],
      onComplete: (selections: Record<string, any>) => {
        console.log('Single select completed:', selections);
      }
    }
  },
  render: (args: any) => ({
    Component: GuidedFlow as any,
    props: args,
  })
};

export const MultiSelect: Story = {
  args: {
    config: {
      steps: [sampleSteps[1]],
      onComplete: (selections: Record<string, any>) => {
        console.log('Multi select completed:', selections);
      }
    }
  },
  render: (args: any) => ({
    Component: GuidedFlow as any,
    props: args,
  })
};

export const InChatWidget: Story = {
  render: () => ({
    Component: ChatWidgetWithGuidedFlow as any,
  })
};

export const WithAllSteps: Story = {
  args: {
    config: {
      steps: sampleSteps,
      onComplete: (selections: Record<string, any>) => {
        console.log('All steps completed:', selections);
      },
      onClose: () => {
        console.log('Flow closed');
      }
    }
  },
  render: (args: any) => ({
    Component: GuidedFlow as any,
    props: args,
  })
};

const edibleFlowSteps = [
  sampleSteps[0], // category
  {
    id: 'subcategory',
    title: 'Which kinds of edibles would you like?',
    subtitle: '(Select up to 2)',
    type: 'multi-select' as const,
    maxSelections: 2,
    required: true,
    options: [
      {
        id: 'chews',
        label: 'Chews',
        value: 'Chews',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="16" width="16" height="8" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M16 20H24" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'chocolates',
        label: 'Chocolates',
        value: 'Chocolates',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M14 18H26M14 22H26" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'cooking-baking',
        label: 'Cooking/Baking',
        value: 'CookingBaking',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="16" height="16" rx="2" stroke="#3b82f6" stroke-width="2"/><path d="M16 16H24M16 20H24M16 24H20" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'drinks',
        label: 'Drinks',
        value: 'Drinks',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 10C16 10 18 8 20 8C22 8 24 10 24 10V28C24 30 22 32 20 32C18 32 16 30 16 28V10Z" stroke="#3b82f6" stroke-width="2"/><path d="M18 14H22M18 18H22" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'gummies',
        label: 'Gummies',
        value: 'Gummies',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/></svg>'
      },
      {
        id: 'live-resin-gummies',
        label: 'Live Resin Gummies',
        value: 'Live Resin Gummies',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/><path d="M20 12V28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'live-rosin-gummies',
        label: 'Live Rosin Gummies',
        value: 'Live Rosin Gummies',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="#3b82f6" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="#3b82f6" stroke-width="2"/><path d="M12 20H28" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/></svg>'
      }
    ]
  },
  sampleSteps[1], // effects
  {
    id: 'dosage-per-piece',
    title: 'Dosage per piece',
    subtitle: '',
    type: 'slider' as const,
    required: true,
    options: [
      {
        id: 'low',
        label: 'Low',
        value: 'low',
        description: '<5mg'
      },
      {
        id: 'medium',
        label: 'Medium',
        value: 'medium',
        description: '5-9mg'
      },
      {
        id: 'high',
        label: 'High',
        value: 'high',
        description: '10mg'
      }
    ]
  },
  sampleSteps[3] // price
];

export const EdibleFlow: Story = {
  args: {
    config: {
      steps: edibleFlowSteps,
      onComplete: (selections: Record<string, any>) => {
        console.log('Edible flow completed:', selections);
      },
      onClose: () => {
        console.log('Flow closed');
      }
    }
  },
  render: (args: any) => ({
    Component: GuidedFlow as any,
    props: args,
  })
};

