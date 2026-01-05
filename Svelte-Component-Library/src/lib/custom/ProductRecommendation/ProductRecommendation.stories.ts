import type { Meta, StoryObj } from '@storybook/svelte';
import ProductRecommendation from './ProductRecommendation.svelte';

const sampleProducts = [
  {
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    title: 'Wireless Headphones',
    price: 99.99,
    rating: 4.5
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    title: 'Smart Watch',
    price: 149.99,
    originalPrice: 199.99,
    discount: 25,
    rating: 4.8
  },
  {
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    title: 'Phone Case',
    price: 29.99,
    rating: 4.2
  },
  {
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    title: 'Running Shoes',
    price: 129.99,
    rating: 5.0
  }
];

const meta = {
  title: 'Custom/ProductRecommendation',
  component: ProductRecommendation as any,
  tags: ['autodocs'],
  parameters: {
    docs: {
      source: {
        state: 'open'
      }
    }
  },
  argTypes: {
    layout: {
      control: 'select',
      options: ['carousel', 'compact-list', 'grid', 'bubble-grid']
    },
    title: { control: 'text' },
    description: { control: 'text' },
    onAddToCart: { action: 'addToCart' },
    onViewDetails: { action: 'viewDetails' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Carousel: Story = {
  args: {
    products: sampleProducts,
    layout: 'carousel',
    title: 'Trending Now',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const CompactList: Story = {
  args: {
    products: sampleProducts,
    layout: 'compact-list',
    title: 'Quick Picks',
    description: 'Popular items',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const Grid: Story = {
  args: {
    products: sampleProducts,
    layout: 'grid',
    title: 'Best Sellers',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const BubbleGrid: Story = {
  args: {
    products: sampleProducts,
    layout: 'bubble-grid',
    title: 'Recommended Products',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

