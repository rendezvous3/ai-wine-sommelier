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

const cannabisProducts = [
  {
    image: 'https://images.dutchie.com/18b27a429e98dae603d8d4591d01e0a5?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=787.5&dpr=2&ixlib=react-9.8.1',
    title: 'Pink Push Pop X Sour Tangie | Indica X Sativa | Flower',
    brand: 'FLAV',
    price: 100.0,
    category: 'flower',
    type: 'hybrid',
    thc_percentage: 27.0
  },
  {
    image: 'https://images.dutchie.com/47c7bab14f7c535a2dffb7c3709f3b0b?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=410&dpr=2&ixlib=react-9.8.1',
    title: 'Gelato 51 - Diamond Dusted Prerolls - 5 pack',
    brand: 'TO THE MOON',
    price: 51.0,
    category: 'prerolls',
    type: 'indica',
    thc_percentage: 26.0,
    pack_count: 5
  },
  {
    image: 'https://images.dutchie.com/e51716df58bb0b84d840c1e495e64649?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=717.5&dpr=2&ixlib=react-9.8.1',
    title: 'Sour Cherry Indica Enhanced Gummies',
    brand: 'WYLD',
    price: 26.0,
    category: 'edibles',
    subcategory: 'gummies',
    thc_per_unit_mg: 10.0,
    pack_count: 10
  },
  {
    image: 'https://images.dutchie.com/367f23ea4a1df26da02b2be0775879fa?auto=format%2Ccompress&cs=srgb&fit=fill&fill=solid&fillColor=%23fff&w=717.5&dpr=2&ixlib=react-9.8.1',
    title: 'Dark Chocolate - THC - Indica',
    brand: 'GRÖN',
    price: 28.0,
    category: 'edibles',
    subcategory: 'chocolate',
    thc_per_unit_mg: 3.0
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
      options: ['carousel', 'compact-list', 'compact-grid', 'grid', 'bubble-grid']
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

export const WithBrandAndTHC: Story = {
  args: {
    products: cannabisProducts,
    layout: 'compact-list',
    title: 'Cannavita Budtender Recommendations',
    actionType: 'link',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

export const CompactGrid: Story = {
  args: {
    products: cannabisProducts,
    layout: 'compact-grid',
    title: 'Cannavita Budtender Recommendations',
    actionType: 'link',
    onAddToCart: (product) => console.log('Added to cart:', product)
  },
};

