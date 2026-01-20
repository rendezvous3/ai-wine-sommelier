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

export const WithBrandAndTHC: Story = {
  args: {
    image: 'https://images.dutchie.com/47c7bab14f7c535a2dffb7c3709f3b0b?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=410&dpr=2&ixlib=react-9.8.1',
    title: 'Gelato 51 - Diamond Dusted Prerolls - 5 pack',
    brand: 'TO THE MOON',
    price: 51.0,
    category: 'prerolls',
    type: 'indica',
    thc_percentage: 26.0,
    pack_count: 5,
    actionType: 'link',
    shopLink: 'https://cannavita.us/shop/?dtche%5Bproduct%5D=gelato-51-diamond-dusted-prerolls-5-pack-3-5g-94245',
    onAddToCart: () => console.log('Added to cart')
  },
};

export const EdibleWithTHC: Story = {
  args: {
    image: 'https://images.dutchie.com/e51716df58bb0b84d840c1e495e64649?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=717.5&dpr=2&ixlib=react-9.8.1',
    title: 'Sour Cherry Indica Enhanced Gummies',
    brand: 'WYLD',
    price: 26.0,
    category: 'edibles',
    subcategory: 'gummies',
    thc_per_unit_mg: 10.0,
    pack_count: 10,
    actionType: 'link',
    shopLink: 'https://cannavita.us/shop/?dtche%5Bproduct%5D=sour-cherry-indica-enhanced-gummies-10121',
    onAddToCart: () => console.log('Added to cart')
  },
};

export const ChocolateWithTHC: Story = {
  args: {
    image: 'https://images.dutchie.com/367f23ea4a1df26da02b2be0775879fa?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=717.5&dpr=2&ixlib=react-9.8.1',
    title: 'Dark Chocolate - THC - Indica',
    brand: 'GRÖN',
    price: 28.0,
    category: 'edibles',
    subcategory: 'chocolate',
    thc_per_unit_mg: 3.0,
    actionType: 'link',
    shopLink: 'https://cannavita.us/shop/?dtche%5Bproduct%5D=dark-chocolate-thc-indica',
    onAddToCart: () => console.log('Added to cart')
  },
};

