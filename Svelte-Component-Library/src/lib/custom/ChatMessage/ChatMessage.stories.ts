import type { Meta, StoryObj } from '@storybook/svelte';
import ChatMessage from './ChatMessage.svelte';
import ChatWidgetDecorator from '../ChatWidget/ChatWidgetDecorator.svelte';

const meta = {
  title: 'Custom/ChatMessage',
  component: ChatMessage as any,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['user', 'assistant', 'system']
    },
    sender: { control: 'text' },
    timestamp: { control: 'text' },
    showHoverActions: { control: 'boolean' },
    messageText: { control: 'text' },
    recommendationTitle: { control: 'text' }
  },
} satisfies Meta<any>;

export default meta;
type Story = StoryObj<any>;

export const User: Story = {
  args: {
    variant: 'user',
    sender: 'You',
    timestamp: '2:31 PM',
    messageText: 'I need help finding a good headphone'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="user"
	sender="You"
	timestamp="2:31 PM"
	messageText="I need help finding a good headphone"
/>`
      }
    }
  }
};

export const Assistant: Story = {
  args: {
    variant: 'assistant',
    sender: 'Support Bot',
    timestamp: '2:30 PM',
    messageText: 'Hi! How can I help you today?'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	sender="Support Bot"
	timestamp="2:30 PM"
	messageText="Hi! How can I help you today?"
/>`
      }
    }
  }
};

export const System: Story = {
  args: {
    variant: 'system',
    messageText: 'Welcome! Ask me anything about products.'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="system"
	messageText="Welcome! Ask me anything about products."
/>`
      }
    }
  }
};

export const WithHoverActions: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: true,
    messageText: 'Hover over this message to see the action buttons (copy, react, reply).'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={true}
	messageText="Hover over this message to see the action buttons (copy, react, reply)."
/>`
      }
    }
  }
};

export const WithoutHoverActions: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: false,
    messageText: 'This message has hover actions disabled. No action buttons will appear on hover.'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={false}
	messageText="This message has hover actions disabled. No action buttons will appear on hover."
/>`
      }
    }
  }
};

export const UserWithHoverActions: Story = {
  args: {
    variant: 'user',
    showHoverActions: true,
    messageText: 'This user message has hover actions enabled.'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="user"
	showHoverActions={true}
	messageText="This user message has hover actions enabled."
/>`
      }
    }
  }
};

export const UserWithoutHoverActions: Story = {
  args: {
    variant: 'user',
    showHoverActions: false,
    messageText: 'This user message has hover actions disabled (typical for user messages).'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="user"
	showHoverActions={false}
	messageText="This user message has hover actions disabled (typical for user messages)."
/>`
      }
    }
  }
};

const sampleProducts = [
  {
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    title: 'Wireless Headphones',
    price: 99.99,
    rating: 4.5,
    category: 'Audio'
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    title: 'Smart Watch',
    price: 149.99,
    originalPrice: 199.99,
    discount: 25,
    rating: 4.8,
    category: 'Wearables'
  },
  {
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    title: 'Phone Case',
    price: 29.99,
    rating: 4.2,
    category: 'Accessories'
  }
];

export const WithProductsCompact: Story = {
  args: {
    variant: 'assistant',
    sender: 'Support Bot',
    timestamp: '2:30 PM',
    products: sampleProducts,
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Check out these quick picks:'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	sender="Support Bot"
	timestamp="2:30 PM"
	products={sampleProducts}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Check out these quick picks:"
/>`
      }
    }
  }
};

export const WithProductsHoverEnabled: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: true,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      },
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 2',
        price: 49.99,
        rating: 4.8,
        category: 'Accessories'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products I recommend:'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={true}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		},
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 2',
			price: 49.99,
			rating: 4.8,
			category: 'Accessories'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products I recommend:"
/>`
      }
    }
  }
};

export const WithProductsHoverDisabled: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: false,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products (hover actions disabled):'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={false}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products (hover actions disabled):"
/>`
      }
    }
  }
};

// Stories in ChatWidget context
export const WithProductsCompactInWidget: Story = {
  args: {
    variant: 'assistant',
    sender: 'Support Bot',
    timestamp: '2:30 PM',
    products: sampleProducts,
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    showHoverActions: true,
    recommendationTitle: 'Check out these quick picks:'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	sender="Support Bot"
	timestamp="2:30 PM"
	products={sampleProducts}
	recommendationLayout="compact-list"
	productsInBubble={true}
	showHoverActions={true}
	recommendationTitle="Check out these quick picks:"
/>`
      }
    }
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

export const WithProductsHoverEnabledInWidget: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: true,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      },
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 2',
        price: 49.99,
        rating: 4.8,
        category: 'Accessories'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products I recommend:'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={true}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		},
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 2',
			price: 49.99,
			rating: 4.8,
			category: 'Accessories'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products I recommend:"
/>`
      }
    }
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

export const WithProductsHoverDisabledInWidget: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: false,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products (hover actions disabled):'
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={false}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products (hover actions disabled):"
/>`
      }
    }
  },
  decorators: [
    () => ({
      Component: ChatWidgetDecorator as any,
    })
  ],
};

// Stories in ChatWindow context
export const WithProductsCompactInWindow: Story = {
  args: {
    variant: 'assistant',
    sender: 'Support Bot',
    timestamp: '2:30 PM',
    products: sampleProducts,
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    showHoverActions: true,
    recommendationTitle: 'Check out these quick picks:'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	sender="Support Bot"
	timestamp="2:30 PM"
	products={sampleProducts}
	recommendationLayout="compact-list"
	productsInBubble={true}
	showHoverActions={true}
	recommendationTitle="Check out these quick picks:"
/>`
      }
    }
  }
};

export const WithProductsHoverEnabledInWindow: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: true,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      },
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 2',
        price: 49.99,
        rating: 4.8,
        category: 'Accessories'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products I recommend:'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={true}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		},
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 2',
			price: 49.99,
			rating: 4.8,
			category: 'Accessories'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products I recommend:"
/>`
      }
    }
  }
};

export const WithProductsHoverDisabledInWindow: Story = {
  args: {
    variant: 'assistant',
    showHoverActions: false,
    products: [
      {
        image: 'https://via.placeholder.com/200',
        title: 'Product 1',
        price: 29.99,
        originalPrice: 39.99,
        rating: 4.5,
        discount: 25,
        category: 'Electronics'
      }
    ],
    recommendationLayout: 'compact-list',
    productsInBubble: true,
    recommendationTitle: 'Here are some products (hover actions disabled):'
  },
  parameters: {
    docs: {
      source: {
        type: 'code',
        code: `<ChatMessage
	variant="assistant"
	showHoverActions={false}
	products={[
		{
			image: 'https://via.placeholder.com/200',
			title: 'Product 1',
			price: 29.99,
			originalPrice: 39.99,
			rating: 4.5,
			discount: 25,
			category: 'Electronics'
		}
	]}
	recommendationLayout="compact-list"
	productsInBubble={true}
	recommendationTitle="Here are some products (hover actions disabled):"
/>`
      }
    }
  }
};
