<script lang="ts">
  import { onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
  import ShimmerText from "../../Svelte-Component-Library/src/lib/custom/ShimmerText/ShimmerText.svelte";
  import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";
  import { getTHCScaleForCategory } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/thcScales.js";
  import { theme } from "./theme.svelte.js";

  import flowerIcon from "./icons/categories/flower.png";
  import prerollIcon from "./icons/categories/preroll.png";
  import vapeIcon from "./icons/categories/vape.png";
  import ediblesIcon from "./icons/categories/edibles.png";
  import concentrateIcon from "./icons/categories/concentrate.png";
  import chatIcon from "./icons/assistant/chat.png";

  import calmIcon from "./icons/effects/calm.png";
  import creativeIcon from "./icons/effects/creative.png";
  import energizedIcon from "./icons/effects/energized.png";
  import euphoricIcon from "./icons/effects/euphoric.png";
  import focusedIcon from "./icons/effects/focused.png";
  import relaxedIcon from "./icons/effects/relaxed.png";
  import sedatedIcon from "./icons/effects/sedated.png";
  import sleepyIcon from "./icons/effects/sleepy.png";
  import stimulatedIcon from "./icons/effects/stimulated.png";
  import upliftedIcon from "./icons/effects/uplifted.png";

  import chewsIcon from "./icons/edible_subcategories/chews.png";
  import chocolatesIcon from "./icons/edible_subcategories/chocolates.png";
  import cookingBakingIcon from "./icons/edible_subcategories/cooking_baking.png";
  import drinksIcon from "./icons/edible_subcategories/drinks.png";
  import gummiesIcon from "./icons/edible_subcategories/gummies.png";
  import liveResinGummiesIcon from "./icons/edible_subcategories/live_resin_gummies.png";
  import liveRosinGummiesIcon from "./icons/edible_subcategories/live_rosin_gummies.png";

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
    shimmer?: boolean;  // Add shimmer flag for loading messages
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
    cbd_percentage?: number;
    cbd_per_unit_mg?: number;
    cbd_total_mg?: number;
    total_weight_ounce?: number;
    pack_count?: number;
  }

  let messages = $state<Message[]>([]);
  let input = $state("");
  let loading = $state(false);

  let productRecommendations = $state<Recommendation[]>([]);

  // Fuzzy matching result interface
  interface FuzzyResult {
    product: Recommendation | null;
    confident: boolean;
    score: number;
  }

  // Track the most recently presented product to avoid unnecessary clarification
  interface LastPresentedProduct {
    product: Recommendation;
    messageIndex: number;
  }

  let lastPresentedProduct = $state<LastPresentedProduct | null>(null);

  // CODEX Detection Constants
  const CODEX_PATTERNS = {
    RECOMMEND: [
      "I completely understand what you're looking for",
      "Let me check what we have that matches your preferences",
      "I'm pulling up products that fit your criteria",
      "Checking our inventory based on what you described"
    ],
    PRODUCT_LOOKUP: [
      "Let me look up",
      "I'll pull up the details on"
    ]
  };

  // Detect CODEX cue in text
  function detectCodex(text: string): 'RECOMMEND' | 'PRODUCT_LOOKUP' | null {
    for (const pattern of CODEX_PATTERNS.RECOMMEND) {
      if (text.includes(pattern)) return 'RECOMMEND';
    }
    for (const pattern of CODEX_PATTERNS.PRODUCT_LOOKUP) {
      if (text.includes(pattern)) return 'PRODUCT_LOOKUP';
    }
    return null;
  }

  // Extract product name from PRODUCT_LOOKUP cue
  function extractProductName(text: string): string | null {
    const match = text.match(/Let me look up (.+?) for you/i)
                || text.match(/I'll pull up the details on (.+)/i);
    return match ? match[1].trim() : null;
  }

  // Fuzzy find product in conversation history
  function fuzzyFindProduct(query: string, msgs: Message[]): FuzzyResult {
    const queryLower = query.toLowerCase();
    let bestMatch: Recommendation | null = null;
    let bestScore = 0;

    for (const msg of msgs) {
      if (!msg.recommendations) continue;

      for (const product of msg.recommendations) {
        const nameLower = product.name.toLowerCase();
        const brandLower = (product.brand || '').toLowerCase();

        // Simple fuzzy: check if query words appear in name or brand
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2); // Filter out short words
        if (queryWords.length === 0) continue;

        const matchedWords = queryWords.filter(word =>
          nameLower.includes(word) || brandLower.includes(word)
        );

        const score = matchedWords.length / queryWords.length;
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestMatch = product;
        }
      }
    }

    return {
      product: bestMatch,
      confident: bestScore > 0.7,
      score: bestScore
    };
  }

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
      cbd_percentage: rec.cbd_percentage,
      cbd_per_unit_mg: rec.cbd_per_unit_mg,
      cbd_total_mg: rec.cbd_total_mg,
      total_weight_ounce: rec.total_weight_ounce,
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
        icon: `<img src="${flowerIcon}" alt="Flower" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'prerolls',
        label: 'Prerolls',
        value: 'prerolls',
        icon: `<img src="${prerollIcon}" alt="Prerolls" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'vape-cart',
        label: 'Vape Cart',
        value: 'vaporizers',
        icon: `<img src="${vapeIcon}" alt="Vape Cart" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'edible',
        label: 'Edible',
        value: 'edibles',
        icon: `<img src="${ediblesIcon}" alt="Edible" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'concentrates',
        label: 'Concentrates',
        value: 'concentrates',
        icon: `<img src="${concentrateIcon}" alt="Concentrates" style="width:40px;height:40px;object-fit:contain;" />`
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
        icon: `<img src="${calmIcon}" alt="Calm" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'creative',
        label: 'Creative',
        value: 'creative',
        icon: `<img src="${creativeIcon}" alt="Creative" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'energized',
        label: 'Energized',
        value: 'energized',
        conflictsWith: ['sedated', 'sleepy'],
        icon: `<img src="${energizedIcon}" alt="Energized" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'focused',
        label: 'Focused',
        value: 'focused',
        icon: `<img src="${focusedIcon}" alt="Focused" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'relaxed',
        label: 'Relaxed',
        value: 'relaxed',
        icon: `<img src="${relaxedIcon}" alt="Relaxed" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'euphoric',
        label: 'Euphoric',
        value: 'euphoric',
        icon: `<img src="${euphoricIcon}" alt="Euphoric" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'sedated',
        label: 'Sedated',
        value: 'sedated',
        conflictsWith: ['energized'],
        icon: `<img src="${sedatedIcon}" alt="Sedated" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'sleepy',
        label: 'Sleepy',
        value: 'sleepy',
        conflictsWith: ['energized'],
        icon: `<img src="${sleepyIcon}" alt="Sleepy" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'stimulated',
        label: 'Stimulated',
        value: 'stimulated',
        icon: `<img src="${stimulatedIcon}" alt="Stimulated" style="width:40px;height:40px;object-fit:contain;" />`
      },
      {
        id: 'uplifted',
        label: 'Uplifted',
        value: 'uplifted',
        icon: `<img src="${upliftedIcon}" alt="Uplifted" style="width:40px;height:40px;object-fit:contain;" />`
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
          value: 'chews',
          icon: `<img src="${chewsIcon}" alt="Chews" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'chocolates',
          label: 'Chocolates',
          value: 'chocolates',
          icon: `<img src="${chocolatesIcon}" alt="Chocolates" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'cooking-baking',
          label: 'Cooking/Baking',
          value: 'cooking-baking',
          icon: `<img src="${cookingBakingIcon}" alt="Cooking/Baking" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'drinks',
          label: 'Drinks',
          value: 'drinks',
          icon: `<img src="${drinksIcon}" alt="Drinks" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'gummies',
          label: 'Gummies',
          value: 'gummies',
          icon: `<img src="${gummiesIcon}" alt="Gummies" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'live-resin-gummies',
          label: 'Live Resin Gummies',
          value: 'live-resin-gummies',
          icon: `<img src="${liveResinGummiesIcon}" alt="Live Resin Gummies" style="width:40px;height:40px;object-fit:contain;" />`
        },
        {
          id: 'live-rosin-gummies',
          label: 'Live Rosin Gummies',
          value: 'live-rosin-gummies',
          icon: `<img src="${liveRosinGummiesIcon}" alt="Live Rosin Gummies" style="width:40px;height:40px;object-fit:contain;" />`
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
  // PRODUCT QUESTION HANDLER
  // ------------------------------------------------------
  async function handleProductQuestion(productQuery: string, payload: { messages: Message[] }) {
    // Phase 1: Fuzzy match in conversation history (no API call)
    const fuzzyResult = fuzzyFindProduct(productQuery, messages);

    // Check if this matches the recently presented product (within last 3 messages)
    const currentMessageIndex = messages.length;
    const isRecentFollowUp = lastPresentedProduct &&
                             fuzzyResult.product?.id === lastPresentedProduct.product.id &&
                             (currentMessageIndex - lastPresentedProduct.messageIndex) <= 3;

    if (fuzzyResult.confident && fuzzyResult.product) {
      // High confidence match in history - stream with full context
      await streamWithProductContext(fuzzyResult.product, payload);
      return;
    } else if (fuzzyResult.product && !isRecentFollowUp) {
      // Low confidence match - ask follow-up ONLY if it's not a recent follow-up
      // (Don't ask "Did you mean X?" immediately after presenting X)
      await streamFollowUp(`Do you mean ${fuzzyResult.product.name}?`, payload);
      return;
    } else if (isRecentFollowUp && lastPresentedProduct) {
      // This is a follow-up about the product we just presented - stream with context
      await streamWithProductContext(lastPresentedProduct.product, payload);
      return;
    }

    // Phase 2: Semantic search via backend (product not in history)
    try {
      const lookupResp = await fetch(`${BASE_URL}/product-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_query: productQuery })
      });

      if (!lookupResp.ok) {
        // Fallback to regular stream if lookup fails
        await streamFollowUp(
          "I couldn't find that product. Would you like me to search for recommendations?",
          payload
        );
        return;
      }

      const lookupResult = await lookupResp.json();

      if (lookupResult.confidence > 0.7 && lookupResult.product) {
        // High confidence - stream with product context
        await streamWithProductContext(lookupResult.product, payload);
      } else if (lookupResult.needsClarification) {
        // Low/medium confidence - stream follow-up question
        await streamFollowUp(lookupResult.message, payload);
      } else {
        // No match - offer to search for recommendations
        await streamFollowUp(
          "I couldn't find that product in our inventory. Would you like me to search for recommendations?",
          payload
        );
      }
    } catch (err) {
      console.error("Product lookup failed:", err);
      await streamFollowUp(
        "I'm having trouble finding that product. Could you tell me more about what you're looking for?",
        payload
      );
    }
  }

  // Stream response with product context
  async function streamWithProductContext(product: Recommendation | Record<string, any> | null, payload: { messages: Message[] }) {
    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = null;

    try {
      const resp = await fetch(`${BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          productContext: product ? JSON.stringify(product, null, 2) : null
        }),
      });

      if (!resp.ok || !resp.body) {
        messages = [...messages, {
          role: "assistant",
          content: "I'm having trouble getting that information. Please try again."
        }];
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let parts = buffer.split("\n\n");

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

              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: botMessageContent }];
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: botMessageContent },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            console.error("Stream parse error:", err);
          }
        }

        buffer = parts[parts.length - 1];
      }

      // After streaming completes, add the product card as a recommendation
      if (product && streamingMessageIndex !== null) {
        const productRecommendation: Recommendation = {
          id: product.id || '',
          name: product.name || '',
          price: product.price || 0,
          image: product.imageLink || product.image || '',
          imageLink: product.imageLink || product.image || '',
          shopLink: product.shopLink || '',
          description: product.description || '',
          category: product.category || '',
          subcategory: product.subcategory || '',
          type: product.type || '',
          brand: product.brand || '',
          thc_percentage: product.thc_percentage,
          thc_per_unit_mg: product.thc_per_unit_mg,
          thc_total_mg: product.thc_total_mg,
          cbd_percentage: product.cbd_percentage,
          cbd_per_unit_mg: product.cbd_per_unit_mg,
          cbd_total_mg: product.cbd_total_mg,
          total_weight_ounce: product.total_weight_ounce,
          pack_count: product.pack_count
        };

        // Add product card message after the description
        messages = [
          ...messages.slice(0, streamingMessageIndex + 1),
          {
            role: "assistant",
            content: "",
            recommendations: [productRecommendation]
          },
          ...messages.slice(streamingMessageIndex + 1)
        ];

        // Track this as the most recently presented product
        lastPresentedProduct = {
          product: productRecommendation,
          messageIndex: streamingMessageIndex + 1  // The product card message index
        };
      }
    } catch (err) {
      console.error("Stream failed:", err);
      messages = [...messages, {
        role: "assistant",
        content: "I'm having trouble getting that information. Please try again."
      }];
    }
  }

  // Stream follow-up question for clarification
  async function streamFollowUp(clarificationMessage: string, payload: { messages: Message[] }) {
    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = null;

    try {
      const resp = await fetch(`${BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clarificationContext: clarificationMessage
        }),
      });

      if (!resp.ok || !resp.body) {
        messages = [...messages, {
          role: "assistant",
          content: clarificationMessage  // Fallback to showing the clarification directly
        }];
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let parts = buffer.split("\n\n");

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

              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: botMessageContent }];
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: botMessageContent },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            console.error("Stream parse error:", err);
          }
        }

        buffer = parts[parts.length - 1];
      }
    } catch (err) {
      console.error("Stream failed:", err);
      messages = [...messages, {
        role: "assistant",
        content: clarificationMessage  // Fallback to showing the clarification directly
      }];
    }
  }

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

    // STREAM-FIRST ARCHITECTURE
    // STEP 1: Stream immediately (instant feedback)
    let fullStreamText = "";
    let streamingMessageIndex: number | null = null;
    let buffer = "";

    try {
      const resp = await fetch(`${BASE_URL}/stream`, {
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
              fullStreamText += token;

              // Create message only when we have the first token (avoid empty bubble)
              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: fullStreamText }];
              } else {
                // Update the existing streaming message
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: fullStreamText },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            console.error("Stream parse error:", err);
          }
        }

        // Keep the incomplete part for next read
        buffer = parts[parts.length - 1];
      }
    } catch (err) {
      console.error("Stream failed:", err);
      messages = [...messages, {
        role: "assistant",
        content: "Our streaming service is experiencing technical difficulties. Please try again."
      }];
      loading = false;
      return;
    }

    // STEP 2: Detect CODEX cue in stream text
    const codex = detectCodex(fullStreamText);

    // STEP 3: Handle based on CODEX
    if (codex === 'RECOMMEND') {
      // Add shimmer loading message
      const finalStreamingIndex = streamingMessageIndex !== null ? streamingMessageIndex : messages.length - 1;
      const shimmerIndex = finalStreamingIndex + 1;
      messages = [
        ...messages.slice(0, shimmerIndex),
        { role: "assistant", content: "Looking for best matches...", shimmer: true },
        ...messages.slice(shimmerIndex)
      ];

      // Wait a tiny bit for shimmer to render
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        // Call intent API (simplified - just extracts filters)
        // IMPORTANT: Create fresh payload with updated messages (includes stream response)

        // IMPORTANT: Filter out shimmer messages (UI-only, not for API)
        const messagesForApi = messages.filter(m => !m.shimmer);
        const intentPayload = { messages: messagesForApi };

        const intentResp = await fetch(`${BASE_URL}/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(intentPayload),
        });

        if (!intentResp.ok) {
          const errorData = await intentResp.json().catch(() => ({}));
          messages = [
            ...messages.slice(0, shimmerIndex),
            { role: "assistant", content: errorData.error || "Our AI understanding service is experiencing technical difficulties. Please try again." },
            ...messages.slice(shimmerIndex + 1)
          ];
          loading = false;
          return;
        }

        const intentData = await intentResp.json();
        const intentFilters = intentData.filters || {};
        const semanticSearch = intentData.semantic_search || "";

        // Call recommendations API
        // IMPORTANT: Filter out shimmer messages (UI-only, not for API)
        const recResp = await fetch(`${BASE_URL}/recommendations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messagesForApi,
            filters: intentFilters,
            semantic_search: semanticSearch
          }),
        });

        if (!recResp.ok) {
          const errorData = await recResp.json().catch(() => ({}));
          messages = [
            ...messages.slice(0, shimmerIndex),
            { role: "assistant", content: errorData.error || "Our recommendation service is experiencing technical difficulties. Please try again." },
            ...messages.slice(shimmerIndex + 1)
          ];
          loading = false;
          return;
        }

        const recData = await recResp.json();
        productRecommendations = recData.recommendations || [];

        // Replace shimmer with recommendations
        if (productRecommendations.length > 0) {
          const botMessage: Message = {
            role: "assistant",
            content: "",
            recommendations: productRecommendations,
          };
          messages = [
            ...messages.slice(0, shimmerIndex),
            botMessage,
            ...messages.slice(shimmerIndex + 1)
          ];
        } else {
          // Remove shimmer if no recommendations
          messages = [
            ...messages.slice(0, shimmerIndex),
            ...messages.slice(shimmerIndex + 1)
          ];
        }
      } catch (err) {
        console.error("Recommendation flow failed:", err);
        messages = [
          ...messages.slice(0, shimmerIndex),
          { role: "assistant", content: "Our recommendation service is experiencing technical difficulties. Please try again." },
          ...messages.slice(shimmerIndex + 1)
        ];
      }
    } else if (codex === 'PRODUCT_LOOKUP') {
      // Extract product name from stream text
      const productName = extractProductName(fullStreamText);
      if (productName) {
        // Call product-lookup flow (existing function)
        // IMPORTANT: Use fresh messages (includes stream response)
        await handleProductQuestion(productName, { messages });
      }
    }
    // else: No CODEX = just conversation, we're done

    loading = false;
  }
</script>

<!-- Replace UI with ChatWidget from Component Library -->
<!-- background colors: "#0dcc218f" "#14c3268f" "#15685E" #F4C37D #6ed39f80 "#8aff5ec9" "#50ff5a8f "#1ba4298f" "#1e8e298f" "#14c3268f" -->
 <!-- First one is beautiful #70CCC1 #61CE70  -->
 <!-- Cannavita Colors - green hints: #70CCC1 #15685E #033D36 #03302B #022622 -->
  <!-- Cannavita Colors - gold Hints: #FAE4C4 #F8D9AC #F4C37D #BD9760 #A38253 #F4C37  -->
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
  themeBackgroundColor="#F4C37D"
  iconSrc={chatIcon}
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
  noAssistantBubble={true}
>
  {#snippet children()}
    {#if messages.length === 0}
      <ChatMessage variant="system" messageText="Welcome! Ask me anything about products." />
    {/if}

    {#each messages as msg}
      {#if msg.shimmer === true}
        <!-- Render shimmer text for loading messages -->
        <div class="shimmer-message">
          <ShimmerText
            text={msg.content}
            speed={2.5}
            baseColor="#8b8b8b"
            highlightColor="#e0e0e0"
            fontSize="0.875rem"
          />
        </div>
      {:else}
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
      {/if}
    {/each}
  {/snippet}
</ChatWidget>

<style>
  :global(*) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .shimmer-message {
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    opacity: 0.8;
  }
</style>
