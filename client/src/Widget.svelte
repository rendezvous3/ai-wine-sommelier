<script lang="ts">
  import { onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
  import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";
  import { getTHCScaleForCategory } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/thcScales.js";
  import { theme } from "./theme.svelte.js";

  let isOpen = $state(false);
  let mode = $state<'chat' | 'guided-flow'>('chat');

  const BASE_URL = import.meta.env.VITE_BASE_API_URL;
  const storeName = import.meta.env.VITE_STORE_NAME;

  let isInitialized = $state(false);

  const STORAGE_KEY = `widget_chat_${storeName}`;
  interface Message {
    role: "user" | "assistant";
    content: string;
    recommendations?: Recommendation[];
  }

  interface Recommendation {
    id: string;
    name: string;
    price: number;
    image: string;  // This should map to imageLink from backend
    imageLink?: string;  // Backend returns this
    shopLink?: string;  // Add this
    description: string;
    category?: string;
    subcategory?: string;
    type?: string;
    brand?: string;
    thc_percentage?: number;
    thc_per_unit_mg?: number;
    thc_total_mg?: number;
    pack_count?: number;
  }

  let messages = $state<Message[]>([]);
  let input = $state("");
  let loading = $state(false);

  let productRecommendations = $state<Recommendation[]>([]);

  // Menu items for the header
  const menuItems = [
    { id: 'settings', label: 'Settings', icon: 'settings', iconType: 'svg' as const },
    { id: 'help', label: 'Help', icon: 'help', iconType: 'svg' as const },
    { id: 'about', label: 'About', icon: 'about', iconType: 'svg' as const },
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const }
  ];

  function handleMenuItemClick(itemId: string) {
    console.log('Menu item clicked:', itemId);
    // Add menu item action handlers here
  }


  onMount(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        messages = JSON.parse(saved);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Apply theme
    theme.apply();

    isInitialized = true;
  });

  $effect(() => {
    if (isInitialized) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }
  });

  // Convert Recommendation to Product format for ChatMessage
  function convertToProducts(recommendations: Recommendation[]) {
    return recommendations.map(rec => ({
      image: rec.imageLink || rec.image || '',  // Prefer imageLink, fallback to image
      title: rec.name || '',
      price: rec.price != null && !isNaN(rec.price) ? rec.price : 0,
      originalPrice: undefined,
      rating: undefined,
      discount: undefined,
      category: rec.category,
      subcategory: rec.subcategory,
      type: rec.type,
      shopLink: rec.shopLink,
      brand: rec.brand,
      thc_percentage: rec.thc_percentage,
      thc_per_unit_mg: rec.thc_per_unit_mg,
      thc_total_mg: rec.thc_total_mg,
      pack_count: rec.pack_count
    }));
  }

  // Wrapper for ChatWidget's onSend
  function handleSend(message: string) {
    handleChat(message);
  }

  // Clear chat function
  function handleClearChat() {
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // Track selected category for dynamic THC scale
  let selectedCategory = $state<string | null>(null);

  // Helper function to create THC percentage options from scale
  function createTHCOptions(scale: ReturnType<typeof getTHCScaleForCategory>) {
    return scale.map(option => ({
      id: option.id,
      label: option.label,
      value: option.value,
      description: option.description,
      icon: getTHCIcon(option.id)
    }));
  }

  // Helper function to get icon for THC percentage option
  function getTHCIcon(id: string): string {
    const icons: Record<string, string> = {
      'mild': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="18" width="20" height="4" rx="2" fill="currentColor"/></svg>',
      'balanced': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="16" width="20" height="8" rx="2" fill="currentColor"/></svg>',
      'moderate': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" fill="currentColor"/></svg>',
      'strong': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="12" width="20" height="16" rx="2" fill="currentColor"/></svg>',
      'very-strong': '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="20" height="20" rx="2" fill="currentColor"/></svg>'
    };
    return icons[id] || icons['mild'];
  }

  // Get THC percentage options based on selected category
  const thcPercentageOptions = $derived.by(() => {
    const scale = getTHCScaleForCategory(selectedCategory);
    return createTHCOptions(scale);
  });

  // Category step (shared by both flows)
  const categoryStep = {
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
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 10C20 10 15 5 10 10C10 15 15 20 20 25C25 20 30 15 30 10C25 5 20 10 20 10Z" fill="currentColor" opacity="0.3"/><path d="M20 8C20 8 14 2 8 8C8 14 14 20 20 28C26 20 32 14 32 8C26 2 20 8 20 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'prerolls',
        label: 'Prerolls',
        value: 'prerolls',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="16" height="4" rx="2" fill="currentColor"/><circle cx="20" cy="20" r="2" fill="currentColor"/></svg>'
      },
      {
        id: 'vape-cart',
        label: 'Vape Cart',
        value: 'vaporizers',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="8" height="20" rx="1" stroke="currentColor" stroke-width="2"/><path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'edible',
        label: 'Edible',
        value: 'edibles',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M14 18H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'concentrates',
        label: 'Concentrates',
        value: 'concentrates',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 16L24 24M24 16L16 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      }
    ]
  };

  // Effects step (shared by both flows)
  const effectsStep = {
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
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'creative',
        label: 'Creative',
        value: 'creative',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'energized',
        label: 'Energized',
        value: 'energized',
        conflictsWith: ['sedated', 'sleepy'],
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 8L24 16L32 18L26 24L28 32L20 28L12 32L14 24L8 18L16 16L20 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'focused',
        label: 'Focused',
        value: 'focused',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>'
      },
      {
        id: 'relaxed',
        label: 'Relaxed',
        value: 'relaxed',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 24C12 24 16 20 20 24C24 20 28 24 28 24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/></svg>'
      },
      {
        id: 'euphoric',
        label: 'Euphoric',
        value: 'euphoric',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12L22 18L28 20L22 22L20 28L18 22L12 20L18 18L20 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'sedated',
        label: 'Sedated',
        value: 'sedated',
        conflictsWith: ['energized'],
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M14 20H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'sleepy',
        label: 'Sleepy',
        value: 'sleepy',
        conflictsWith: ['energized'],
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20C16 20 18 22 20 22C22 22 24 20 24 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M14 16L16 18M24 16L26 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'stimulated',
        label: 'Stimulated',
        value: 'stimulated',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M20 12V16M20 24V28M12 20H16M24 20H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'uplifted',
        label: 'Uplifted',
        value: 'uplifted',
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 12L24 20L32 22L26 28L28 36L20 32L12 36L14 28L8 22L16 20L20 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    ]
  };

  // Price step (shared by both flows)
  const priceStep = {
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
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="8" stroke="currentColor" stroke-width="2"/><path d="M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      },
      {
        id: 'low',
        label: '$0-25',
        value: { price_min: 0, price_max: 25 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'medium',
        label: '$25-50',
        value: { price_min: 25, price_max: 50 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'high',
        label: '$50-75',
        value: { price_min: 50, price_max: 75 },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      },
      {
        id: 'premium',
        label: '$75+',
        value: { price_min: 75, price_max: null },
        icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16L20 10L28 16V28C28 29.1 27.1 30 26 30H14C12.9 30 12 29.1 12 28V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22L20 18L24 22M20 18V26M16 26H24M18 24H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
    ]
  };

  // Standard flow steps (for Flower, Prerolls, Vaporizers, Concentrates)
  const standardFlowSteps = $derived([
    categoryStep,
    effectsStep,
    {
      id: 'thc-percentage',
      title: 'How potent would you like it?',
      subtitle: '(Select one)',
      type: 'single-select' as const,
      required: true,
      options: thcPercentageOptions
    },
    priceStep
  ]);

  // Edibles flow steps
  const ediblesFlowSteps = $derived([
    categoryStep,
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
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="16" width="16" height="8" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 20H24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'chocolates',
          label: 'Chocolates',
          value: 'Chocolates',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="14" width="20" height="12" rx="2" stroke="currentColor" stroke-width="2"/><path d="M14 18H26M14 22H26" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'cooking-baking',
          label: 'Cooking/Baking',
          value: 'CookingBaking',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="12" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M16 16H24M16 20H24M16 24H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'drinks',
          label: 'Drinks',
          value: 'Drinks',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 10C16 10 18 8 20 8C22 8 24 10 24 10V28C24 30 22 32 20 32C18 32 16 30 16 28V10Z" stroke="currentColor" stroke-width="2"/><path d="M18 14H22M18 18H22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'gummies',
          label: 'Gummies',
          value: 'Gummies',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="currentColor" stroke-width="2"/></svg>'
        },
        {
          id: 'live-resin-gummies',
          label: 'Live Resin Gummies',
          value: 'Live Resin Gummies',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="currentColor" stroke-width="2"/><path d="M20 12V28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        },
        {
          id: 'live-rosin-gummies',
          label: 'Live Rosin Gummies',
          value: 'Live Rosin Gummies',
          icon: '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="16" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3"/><circle cx="16" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="16" r="4" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="24" r="4" stroke="currentColor" stroke-width="2"/><circle cx="24" cy="24" r="4" stroke="currentColor" stroke-width="2"/><path d="M12 20H28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        }
      ]
    },
    effectsStep,
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
          description: '<5 mg'
        },
        {
          id: 'medium',
          label: 'Medium',
          value: 'medium',
          description: '5-9 mg'
        },
        {
          id: 'high',
          label: 'High',
          value: 'high',
          description: '10 mg'
        }
      ]
    },
    priceStep
  ]);

  // Dynamic step selection based on category
  const allGuidedFlowSteps = $derived.by(() => {
    // If category is selected and it's edibles, use edibles flow
    if (selectedCategory === 'edibles') {
      return ediblesFlowSteps;
    }
    // Otherwise use standard flow
    return standardFlowSteps;
  });

  function handleModeToggle() {
    mode = mode === 'chat' ? 'guided-flow' : 'chat';
  }

  async function handleFlowComplete(selections: Record<string, any>, metadata?: import('../../Svelte-Component-Library/src/lib/custom/GuidedFlow/utils.js').TransformedMetadata) {
    console.log('Flow completed:', selections);
    if (metadata) {
      console.log('Transformed Metadata:', metadata.metadata);
      console.log('Query:', metadata.guidedFlowQuery);
      console.log('Filters:', metadata.filters);
    }

    if (!metadata || !metadata.guidedFlowQuery) {
      console.error('No query available from GuidedFlow');
      mode = 'chat';
      return;
    }

    // Switch to chat mode first
    mode = 'chat';
    
    // Add query as user message
    const queryMessage: Message = {
      role: "user",
      content: metadata.guidedFlowQuery
    };
    messages = [...messages, queryMessage];
    loading = true;

    // Call recommendations API
    try {
      const resp = await fetch(
        `${BASE_URL}/recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [queryMessage],
            filters: metadata.filters || {},
            semantic_search: metadata.guidedFlowQuery || ""
          }),
        }
      );
      
      if (!resp.ok) {
        try {
          const errorData = await resp.json();
          messages = [...messages, {
            role: "assistant",
            content: errorData.error || "Our recommendation service is experiencing technical difficulties. Please try again."
          }];
        } catch (parseErr) {
          messages = [...messages, {
            role: "assistant",
            content: "Our recommendation service is experiencing technical difficulties. Please try again."
          }];
        }
        return;
      }
      
      const data = await resp.json();
      
      // Check for error field
      if (data.error) {
        messages = [...messages, {
          role: "assistant",
          content: data.error
        }];
      }
      
      productRecommendations = data.recommendations || [];
      
      // Add recommendations as assistant message (even if there was an error, show fallback results)
      if (productRecommendations.length > 0) {
        const botMessage: Message = {
          role: "assistant",
          content: "",
          recommendations: productRecommendations,
        };
        messages = [...messages, botMessage];
      }
    } catch (err) {
      console.error("Recommendations API failed:", err);
      messages = [...messages, {
        role: "assistant",
        content: "Our recommendation service is experiencing technical difficulties. Please try again."
      }];
    } finally {
      loading = false;
    }
  }

  function handleFlowClose() {
    mode = 'chat';
  }

  function handleSelectionChange(selections: Record<string, any>) {
    // Track category selection for dynamic THC percentage scale
    if (selections['category']) {
      selectedCategory = selections['category'];
    }
  }

  const guidedFlowConfig: GuidedFlowConfig = $derived({
    steps: allGuidedFlowSteps,
    onComplete: handleFlowComplete,
    onClose: handleFlowClose,
    onSelectionChange: handleSelectionChange
  });

  // ------------------------------------------------------
  // MAIN HANDLER (Decision + Stream + Recommendation Tool)
  // ------------------------------------------------------
  async function handleChat(message?: string) {
    const userMsg = message || input.trim();
    if (!userMsg || loading) return;

    messages = [...messages, { role: "user", content: userMsg }];
    if (!message) {
      input = "";
    }
    loading = true;

    const payload = { messages };

    // STEP 1 — Intent Classifier
    let intent = "general";
    let intentFilters: Record<string, any> = {};
    let semanticSearch = "";
    try {
      const decide = await fetch(`${BASE_URL}/intent`, {
        // const decide = await fetch("http://localhost:8787/chat/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      // Check response status before parsing
      if (!decide.ok) {
        try {
          const errorData = await decide.json();
          messages = [...messages, {
            role: "assistant",
            content: errorData.error || "Our AI understanding service is experiencing technical difficulties. Please try again."
          }];
        } catch (parseErr) {
          messages = [...messages, {
            role: "assistant",
            content: "Our AI understanding service is experiencing technical difficulties. Please try again."
          }];
        }
        loading = false;
        return; // Stop processing - can't proceed without intent
      }
      
      const d = await decide.json();
      
      // Check for error field in response
      if (d.error) {
        messages = [...messages, {
          role: "assistant",
          content: d.error
        }];
        loading = false;
        return; // Stop processing - can't proceed without intent
      }
      
      intent = d.intent || "general";
      // Capture filters and semantic_search when intent is recommendation
      if (d.intent === "recommendation") {
        intentFilters = d.filters || {};
        semanticSearch = d.semantic_search || "";
      }
    } catch (err) {
      console.warn("Decision failed, defaulting to general.");
      // Show error to user
      messages = [...messages, {
        role: "assistant",
        content: "Our AI understanding service is experiencing technical difficulties. Please try again."
      }];
      loading = false;
      return;
    }

    let buffer = "";

    // Track the index of the streaming message to ensure we update the correct one
    // This index will be used to update only this specific message, preventing duplicates
    // Defined outside promises so both can access it
    let streamingMessageIndex: number | null = null;
    let botMessageContent = "";

    // STEP 2 — Start STREAMING (Agent 1)
    const streamPromise = (async () => {
      const resp = await fetch(`${BASE_URL}/stream`, {
        // const resp = await fetch("http://localhost:8787/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check for error response before trying to read as stream
      if (!resp.ok) {
        try {
          const errorData = await resp.json();
          const errorMessage = errorData.error || "Our streaming service is experiencing technical difficulties. Please try again.";
          messages = [...messages, {
            role: "assistant",
            content: errorMessage
          }];
        } catch (parseErr) {
          // If error response isn't JSON, show generic message
          messages = [...messages, {
            role: "assistant",
            content: "Our streaming service is experiencing technical difficulties. Please try again."
          }];
        }
        loading = false;
        return;
      }

      if (!resp.body) {
        console.error("No response body from stream");
        messages = [...messages, {
          role: "assistant",
          content: "Our streaming service is experiencing technical difficulties. Please try again."
        }];
        loading = false;
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Append new chunk to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split on double newlines (SSE event boundary)
        let parts = buffer.split("\n\n");

        // Process all complete events
        for (let i = 0; i < parts.length - 1; i++) {
          const event = parts[i].trim();
          if (!event) continue;

          const dataIndex = event.indexOf("data: ");
          if (dataIndex === -1) continue;

          const jsonStr = event.slice(dataIndex + 6);
          if (jsonStr === "[DONE]") continue;

          try {
            const json = JSON.parse(jsonStr);
            const token = json.choices?.[0]?.delta?.content ?? "";
            if (token) {
              botMessageContent += token;
              
              // Create message only when we have the first token (avoid empty bubble)
              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: botMessageContent }];
              } else {
                // Update the existing streaming message
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: botMessageContent },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            // ignore malformed JSON
            console.error("Stream error:", err);
            if (streamingMessageIndex !== null) {
              messages = [
                ...messages.slice(0, streamingMessageIndex),
                { role: "assistant", content: "Sorry, connection lost." },
                ...messages.slice(streamingMessageIndex + 1)
              ];
            }
            loading = false;
          }
        }

        // Keep the incomplete part for next read
        buffer = parts[parts.length - 1];
      }
    })();

    // STEP 3 — Recommendation Tool (only when needed)
    // Make it sequential: wait for stream, then add "Looking for best matches...", then fetch recommendations
    let recPromise = Promise.resolve();
    if (intent === "recommendation") {
      recPromise = (async () => {
        // Step 1: Wait for streaming to complete
        await streamPromise;
        
        // Step 2: Now add "Looking for best matches..." message after streaming is done
        // streamingMessageIndex should be set by now (after first token arrived)
        // If for some reason it's null (no tokens), use messages.length
        const finalStreamingIndex = streamingMessageIndex !== null ? streamingMessageIndex : messages.length - 1;
        const searchingMessageIndex = finalStreamingIndex + 1;
        messages = [
          ...messages.slice(0, searchingMessageIndex),
          { role: "assistant", content: "Looking for best matches..." },
          ...messages.slice(searchingMessageIndex)
        ];
        
        // Step 3: Wait a tiny bit for the "Looking for best matches..." message to render
        // This ensures it appears before we start fetching recommendations
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Step 4: Now fetch recommendations
        try {
          const recPayload = {
            ...payload,
            filters: intentFilters,
            semantic_search: semanticSearch
          };
          const resp = await fetch(
            `${BASE_URL}/recommendations`,
            // const resp = await fetch(
            //   "http://localhost:8787/chat/recommendations",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(recPayload),
            }
          );
          
          // Check response status
          if (!resp.ok) {
            try {
              const errorData = await resp.json();
              const errorMessage = errorData.error || "Our recommendation service is experiencing technical difficulties. Please try again.";
              // Remove "Looking for best matches..." and show error
              messages = [
                ...messages.slice(0, searchingMessageIndex),
                { role: "assistant", content: errorMessage },
                ...messages.slice(searchingMessageIndex + 1)
              ];
            } catch (parseErr) {
              messages = [
                ...messages.slice(0, searchingMessageIndex),
                { role: "assistant", content: "Our recommendation service is experiencing technical difficulties. Please try again." },
                ...messages.slice(searchingMessageIndex + 1)
              ];
            }
            return;
          }
          
          const data = await resp.json();
          
          // Check for error field (even if we have fallback recommendations)
          if (data.error) {
            // Show error message, but still show recommendations if available
            messages = [
              ...messages.slice(0, searchingMessageIndex),
              { role: "assistant", content: data.error },
              ...messages.slice(searchingMessageIndex + 1)
            ];
          }
          
          productRecommendations = data.recommendations || [];
          
          // Step 5: Replace "Looking for best matches..." with recommendations
          // Keep "Looking for best matches..." visible, add recommendations after it
          if (productRecommendations.length > 0) {
            let botMessage: Message = {
              role: "assistant",
              content: "",
              recommendations: productRecommendations,
            };
            // Add recommendations message right after "Looking for best matches..." or error message
            const insertIndex = data.error ? searchingMessageIndex + 1 : searchingMessageIndex + 1;
            messages = [
              ...messages.slice(0, insertIndex),
              botMessage,
              ...messages.slice(insertIndex)
            ];
            // Remove "Looking for best matches..." if it still exists
            if (messages[searchingMessageIndex]?.content === "Looking for best matches...") {
              messages = [
                ...messages.slice(0, searchingMessageIndex),
                ...messages.slice(searchingMessageIndex + 1)
              ];
            }
          } else {
            // If no recommendations, remove "Looking for best matches..." message (if it exists)
            if (messages[searchingMessageIndex]?.content === "Looking for best matches...") {
              messages = [
                ...messages.slice(0, searchingMessageIndex),
                ...messages.slice(searchingMessageIndex + 1)
              ];
            }
          }
        } catch (err) {
          console.error("Recommendation tool failed:", err);
          // Remove "Looking for best matches..." message on error and show error
          messages = [
            ...messages.slice(0, searchingMessageIndex),
            { role: "assistant", content: "Our recommendation service is experiencing technical difficulties. Please try again." },
            ...messages.slice(searchingMessageIndex + 1)
          ];
        }
      })();
    } else {
      // If not recommendation intent, just wait for stream to complete
      await streamPromise;
    }

    await recPromise;
    loading = false;
  }
</script>

<!-- Replace UI with ChatWidget from Component Library -->
<!-- background colors: "#0dcc218f" "#14c3268f" "#15685E" #F4C37D #6ed39f80 "#8aff5ec9" "#50ff5a8f "#1ba4298f" "#1e8e298f" "#14c3268f" -->
<ChatWidget
  isOpen={isOpen}
  onToggle={() => (isOpen = !isOpen)}
  onSend={handleSend}
  position="bottom-right"
  expandIcon="dots"
  headerStyle="minimal"
  menuItems={menuItems}
  menuPosition="left"
  menuMode="sidebar"
  onMenuItemClick={handleMenuItemClick}
  title="Cannavita Budtender"
  themeBackgroundColor="#1ba4298f"
  showBadge={false}
  onClearChat={handleClearChat}
  hasMessages={messages.length > 0}
  clearButtonIcon="erase"
  mode={mode}
  onModeToggle={handleModeToggle}
  modeTogglePosition="lower-left"
  guidedFlowConfig={mode === 'guided-flow' ? guidedFlowConfig : undefined}
  messagesCount={messages.length}
  darkMode={true}
>
  {#snippet children()}
    {#if messages.length === 0}
      <ChatMessage variant="system" messageText="Welcome! Ask me anything about products." />
    {/if}

    {#each messages as msg}
      <ChatMessage
        variant={msg.role}
        messageText={msg.content}
        products={msg.recommendations ? convertToProducts(msg.recommendations) : undefined}
        recommendationTitle={msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0 ? "Cannavita Budtender recommendations" : undefined}
        recommendationLayout="compact-list"
        productsInBubble={true}
        showHoverActions={msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0}
        actionType="link"
      />
    {/each}
  {/snippet}
</ChatWidget>

<style>
  :global(*) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
</style>
