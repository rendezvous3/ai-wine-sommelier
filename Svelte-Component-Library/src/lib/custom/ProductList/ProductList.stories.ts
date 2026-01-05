import type { Meta, StoryObj } from '@storybook/svelte';
import ProductList from './ProductList.svelte';

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
  },
  {
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400',
    title: 'Sunglasses',
    price: 79.99,
    rating: 3.2
  },
  {
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400',
    title: 'Backpack',
    price: 89.99,
    originalPrice: 119.99,
    discount: 25,
    rating: 4.6
  }
];

const meta = {
  title: 'Custom/ProductList',
  component: ProductList as any,
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    showTitle: { control: 'boolean' },
    onAddToCart: { action: 'addToCart' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  args: {
    products: sampleProducts,
    title: 'Recommended Products',
    showTitle: true,
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const WithoutTitle: Story = {
  args: {
    products: sampleProducts,
    showTitle: false,
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const CustomTitle: Story = {
  args: {
    products: sampleProducts,
    title: 'Best Sellers',
    showTitle: true,
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

