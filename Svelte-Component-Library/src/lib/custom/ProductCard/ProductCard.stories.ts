import type { Meta, StoryObj } from '@storybook/svelte';
import ProductCard from './ProductCard.svelte';

const meta = {
  title: 'Custom/ProductCard',
  component: ProductCard as any,
  tags: ['autodocs'],
  argTypes: {
    image: { control: 'text' },
    title: { control: 'text' },
    price: { control: 'number' },
    originalPrice: { control: 'number' },
    rating: { control: 'number' },
    discount: { control: 'number' },
    onAddToCart: { action: 'addToCart' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    title: 'Wireless Headphones',
    price: 99.99,
    rating: 4.5,
    onAddToCart: () => console.log('Added to cart')
  },
};

export const WithDiscount: Story = {
  args: {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    title: 'Smart Watch',
    price: 149.99,
    originalPrice: 199.99,
    discount: 25,
    rating: 4.8,
    onAddToCart: () => console.log('Added to cart')
  },
};

export const WithoutRating: Story = {
  args: {
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    title: 'Phone Case',
    price: 29.99,
    onAddToCart: () => console.log('Added to cart')
  },
};

export const HighRating: Story = {
  args: {
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    title: 'Running Shoes',
    price: 129.99,
    rating: 5.0,
    onAddToCart: () => console.log('Added to cart')
  },
};

export const LowRating: Story = {
  args: {
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
    title: 'Sunglasses',
    price: 79.99,
    rating: 3.2,
    onAddToCart: () => console.log('Added to cart')
  },
};

