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

  const BASE_URL = import.meta.env.VITE_API_URL;
  const storeName = import.meta.env.VITE_STORE_NAME;

  let isInitialized = $state(false);

  const persistChat = false; // Set to true to re-enable localStorage persistence

  const STORAGE_KEY = `widget_chat_${storeName}`;
  interface Message {
    role: "user" | "assistant";
    content: string;
    recommendations?: Recommendation[];
    shimmer?: boolean;  // Add shimmer flag for loading messages
    id?: string;  // Unique identifier for Svelte keying
  }

  // Counter for generating unique message IDs
  let messageIdCounter = 0;

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

  // Helper function to create messages with unique IDs
  function createMessage(role: "user" | "assistant", content: string, extras?: Partial<Message>): Message {
    return {
      id: `msg-${Date.now()}-${messageIdCounter++}`,
      role,
      content,
      ...extras
    };
  }

  let productRecommendations = $state<Recommendation[]>([]);

  // Product registry to track ALL products shown to user (recommendations + lookups)
  let productRegistry = $state<Map<string, Recommendation>>(new Map());

  // Prevent concurrent product lookups
  let productLookupInProgress = $state(false);

  // Abort controller for canceling previous lookups
  let currentLookupController: AbortController | null = null;

  // Store suggested product names from clarification for next query
  let suggestedProductNames: string[] = [];

  // Fuzzy matching result interface
  interface FuzzyResult {
    product: Recommendation | null;
    confident: boolean;
    score: number;
  }

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
      "Let me check on",
      "Let me pull up",
      "I'll pull up the details"
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
    // Try pattern 1: "Let me look up X for you"
    let match = text.match(/Let me look up (.+?)(?:\s+for you|\.)/i);
    if (match && match[1].trim()) return match[1].trim();

    // Try pattern 2: "Let me/I'll pull up the details on X"
    match = text.match(/(?:Let me|I'll) pull up (?:the )?details on (.+?)(?:\s+for you|\.)/i);
    if (match && match[1].trim()) return match[1].trim();

    // Try pattern 3: "Let me check on X"
    match = text.match(/Let me check on (.+?)(?:\s+for you|\.)/i);
    if (match && match[1].trim()) return match[1].trim();

    return null;
  }

  // Fuzzy find product in product registry and conversation history
  function fuzzyFindProduct(query: string, msgs: Message[]): FuzzyResult {
    console.log('[Product Lookup] Fuzzy search for:', query);

    // Stopwords to filter out from matching (same as in handleProductQuestion)
    const stopwords = ['that', 'this', 'the', 'yes', 'yea', 'yeah', 'yep', 'yup', 'one', 'first', 'second', 'product', 'products', 'item', 'stuff', 'thing', 'think', 'guess', 'maybe', 'probably'];

    const normalized = query.toLowerCase().replace(/[^\w\s]/g, '');

    // First: Check registry by normalized name (fastest, exact match)
    const registryMatch = productRegistry.get(`name:${normalized}`);
    if (registryMatch) {
      console.log('[Product Lookup] Found exact match in registry:', registryMatch.name);
      return { product: registryMatch, confident: true, score: 1.0 };
    }

    // Second: Fuzzy match in registry (word-based, excluding stopwords)
    const words = normalized.split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.includes(w));

    if (words.length > 0) {
      for (const [key, product] of productRegistry) {
        if (!key.startsWith('name:')) continue;
        const productName = key.replace('name:', '');

        // Filter stopwords from product name too
        const productWords = productName.split(/\s+/)
          .filter(w => w.length > 2 && !stopwords.includes(w));

        const matchCount = words.filter(w => productWords.some(pw => pw.includes(w) || w.includes(pw))).length;
        if (matchCount >= Math.ceil(words.length * 0.6)) {
          const score = matchCount / words.length;
          console.log('[Product Lookup] Found fuzzy match in registry:', product.name, 'Significant query words:', words, 'Score:', score);
          return {
            product,
            confident: matchCount === words.length,
            score
          };
        }
      }
    }

    // Fallback: Search in message history (legacy support)
    const queryLower = query.toLowerCase();
    let bestMatch: Recommendation | null = null;
    let bestScore = 0;

    for (const msg of msgs) {
      if (!msg.recommendations) continue;

      for (const product of msg.recommendations) {
        const nameLower = product.name.toLowerCase();
        const brandLower = (product.brand || '').toLowerCase();

        // Filter stopwords from query
        const queryWords = queryLower.split(/\s+/)
          .filter(w => w.length > 2 && !stopwords.includes(w));

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

    if (bestMatch) {
      console.log('[Product Lookup] Found match in history:', bestMatch.name, 'Significant query words:', queryLower.split(/\s+/).filter(w => w.length > 2 && !stopwords.includes(w)), 'Score:', bestScore);
    } else {
      console.log('[Product Lookup] No match found');
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
    if (persistChat) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          messages = JSON.parse(saved);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }

    // Apply theme
    theme.apply();

    isInitialized = true;
  });

  $effect(() => {
    if (isInitialized && persistChat) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  });

  // Body scroll lock for mobile fullscreen.
  // position:fixed on body prevents iOS Safari from scrolling the page behind the widget.
  // overflow:hidden alone is not enough — iOS Safari can bypass it for momentum scrolling.
  // We also set the html background to match the widget so the purple page never peeks through.
  $effect(() => {
    const isMobile = window.innerWidth <= 640;
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      const prevHtmlBg = document.documentElement.style.background;
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.background = '#1e1e1e';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      return () => {
        document.documentElement.style.overflow = '';
        document.documentElement.style.background = prevHtmlBg;
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        window.scrollTo(0, scrollY);
      };
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
    gridColumns: 4,
    customStyles: {
      padding: '24px 10px',
      fontSize: '13px'
    },
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

  // Price step (shared by both flows) - uses dynamic category
  const priceStep = $derived({
    id: 'price',
    title: 'Max Price',
    subtitle: '',
    type: 'price-selector' as const,
    required: true,
    category: selectedCategory,
    options: [] // Not used for price-selector
  });

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
      gridColumns: 3,
      cardSize: 'small' as const,
      customStyles: {
        padding: '30px 10px',
        minHeight: '70px'
      },
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

    // Add shimmer loading message
    const shimmerIndex = messages.length;
    messages = [
      ...messages,
      { role: "assistant", content: "Looking for best matches...", shimmer: true }
    ];

    // Wait a tiny bit for shimmer to render
    await new Promise(resolve => setTimeout(resolve, 100));

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
          // Replace shimmer with error message
          messages = [
            ...messages.slice(0, shimmerIndex),
            {
              role: "assistant",
              content: errorData.error || "Our recommendation service is experiencing technical difficulties. Please try again."
            },
            ...messages.slice(shimmerIndex + 1)
          ];
        } catch (parseErr) {
          // Replace shimmer with error message
          messages = [
            ...messages.slice(0, shimmerIndex),
            {
              role: "assistant",
              content: "Our recommendation service is experiencing technical difficulties. Please try again."
            },
            ...messages.slice(shimmerIndex + 1)
          ];
        }
        return;
      }

      const data = await resp.json();

      // Check for error field
      if (data.error) {
        // Replace shimmer with error message
        messages = [
          ...messages.slice(0, shimmerIndex),
          {
            role: "assistant",
            content: data.error
          },
          ...messages.slice(shimmerIndex + 1)
        ];
      }

      productRecommendations = data.recommendations || [];

      // Replace shimmer with recommendations or friendly error message
      if (productRecommendations.length > 0) {
        // Add recommendations to product registry
        productRecommendations.forEach(product => {
          productRegistry.set(product.id, product);
          const normalizedName = product.name.toLowerCase().replace(/[^\w\s]/g, '');
          productRegistry.set(`name:${normalizedName}`, product);
        });
        console.log('[Guided Flow] Added', productRecommendations.length, 'recommendations to registry');

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
        // No recommendations found - show friendly message
        messages = [
          ...messages.slice(0, shimmerIndex),
          {
            role: "assistant",
            content: "I couldn't find any products matching those exact specifications. Try adjusting your preferences, or feel free to ask me about specific products!"
          },
          ...messages.slice(shimmerIndex + 1)
        ];
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
  async function handleProductQuestion(productQuery: string, payload: { messages: Message[] }, reuseMessageIndex?: number | null) {
    console.log('[Product Lookup] Query:', productQuery);
    console.log('[Product Lookup] Reuse message index:', reuseMessageIndex);
    console.log('[Product Lookup] Suggested names from previous clarification:', suggestedProductNames);

    // Prevent concurrent lookups
    if (productLookupInProgress) {
      console.log('[Product Lookup] Blocked: lookup already in progress');
      return;
    }

    // Cancel previous lookup if still running
    if (currentLookupController) {
      console.log('[Product Lookup] Aborting previous lookup');
      currentLookupController.abort();
    }
    currentLookupController = new AbortController();

    try {
      productLookupInProgress = true;

      // Phase 0: Responding to clarification - fuzzy match against suggested names ONLY (scoped search)
      if (suggestedProductNames.length > 0) {
        console.log('[Clarification Scope] User responding to clarification, matching against:', suggestedProductNames);
        const queryLower = productQuery.toLowerCase().trim();

        // Check for simple "yes" confirmation
        const confirmationWords = ['yes', 'yea', 'yeah', 'yep', 'yup', 'sure'];
        const isSimpleConfirmation = confirmationWords.includes(queryLower);

        let matchedProduct: string | null = null;

        if (isSimpleConfirmation) {
          // Use first suggested product
          matchedProduct = suggestedProductNames[0];
          console.log('[Clarification Scope] Simple "yes" confirmation, using first suggestion:', matchedProduct);
        } else {
          // Fuzzy match against suggested names ONLY (NOT global search)
          const stopwords = ['that', 'this', 'the', 'yes', 'yea', 'yeah', 'yep', 'yup', 'one', 'first', 'second', 'think', 'guess', 'maybe', 'probably'];
          const queryWords = queryLower.split(/[\s|]+/).filter(w => w.length >= 3 && !stopwords.includes(w));

          console.log('[Clarification Scope] Fuzzy matching query words:', queryWords);

          for (const suggested of suggestedProductNames) {
            const suggestedLower = suggested.toLowerCase();

            // Extract words from suggested name (excluding stopwords)
            const suggestedWords = suggestedLower.split(/[\s|]+/).filter(w => w.length >= 3 && !stopwords.includes(w));

            // Count matches
            const matchedWordCount = queryWords.filter(qw =>
              suggestedWords.some(sw => sw.includes(qw) || qw.includes(sw))
            ).length;

            // If 50%+ of query words match, consider it a match (lower threshold since scope is limited)
            if (queryWords.length > 0 && matchedWordCount / queryWords.length >= 0.5) {
              matchedProduct = suggested;
              console.log('[Clarification Scope] Matched:', suggested, 'Score:', matchedWordCount / queryWords.length);
              break;
            }
          }

          // If no match, use first suggestion as fallback
          if (!matchedProduct) {
            matchedProduct = suggestedProductNames[0];
            console.log('[Clarification Scope] No clear match, defaulting to first suggestion:', matchedProduct);
          }
        }

        // Use the matched product
        productQuery = matchedProduct;
        suggestedProductNames = [];
        console.log('[Clarification Scope] Final product query:', productQuery);
      }

      // Phase 1: Check product registry (ONLY exact matches - ask first before using)
      const registryMatch = productRegistry.get(`name:${productQuery.toLowerCase().replace(/[^\w\s]/g, '')}`);

      if (registryMatch) {
        // Found exact match in registry - ASK user if they mean this or a new product
        console.log('[Product Registry] Found exact match, asking for clarification:', registryMatch.name);
        suggestedProductNames = [registryMatch.name];
        messages = [...messages, createMessage("assistant", `Are you referring to the ${registryMatch.name} we discussed, or asking about a different product?`)];
        return;
      }

      // NO fuzzy matching from registry - always go to backend for new lookups

      // Phase 2: Backend semantic search (NEW lookups - not in registry)
      // This includes:
      // - First-time product lookups
      // - User responses to clarifications (e.g., "wild cherry", "the second one")
      // Backend semantic search is way smarter than frontend fuzzy matching
      console.log('[Product Lookup] Not found in registry, calling backend API');
      console.log('[Product Lookup] Query for backend:', productQuery);
      const lookupResp = await fetch(`${BASE_URL}/product-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_query: productQuery }),
        signal: currentLookupController.signal
      });

      if (!lookupResp.ok) {
        const errorData = await lookupResp.json().catch(() => ({}));
        console.error('[Product Lookup] API error:', errorData);
        // Show error message directly
        messages = [...messages, createMessage("assistant", errorData.error || "I couldn't find that product. Would you like me to search for recommendations?")];
        return;
      }

      const lookupResult = await lookupResp.json();
      console.log('[Product Lookup] API result:', lookupResult);

      // Lower threshold to 0.65 to catch near-matches (e.g., "Alaskan Thunder Fuck" matching "Ayrloom | Alaskan Thunder Fuck | AIO")
      if (lookupResult.confidence > 0.65 && lookupResult.product) {
        // High confidence - stream with product context, reuse message index
        console.log('[Product Lookup] High confidence from API (>0.65), streaming with context');
        // Clear suggested names since we found a match
        suggestedProductNames = [];
        await streamWithProductContext(lookupResult.product, payload, reuseMessageIndex);
      } else if (lookupResult.needsClarification) {
        // Low/medium confidence - show clarification question
        // Don't reuse message index - keep "Let me look up..." and add clarification below
        console.log('[Product Lookup] Needs clarification');

        // Store suggested names for next query
        if (lookupResult.suggestedNames && Array.isArray(lookupResult.suggestedNames)) {
          suggestedProductNames = lookupResult.suggestedNames;
          console.log('[Product Lookup] Stored suggested names for next query:', suggestedProductNames);
        }

        // Remove "I'm not quite sure which one you mean." prefix from clarification message
        let clarificationMessage = lookupResult.message;
        if (clarificationMessage.includes("I'm not quite sure which one you mean.")) {
          clarificationMessage = clarificationMessage.replace("I'm not quite sure which one you mean. ", "");
        }
        console.log('[Product Lookup] Clarification message:', clarificationMessage);

        // Show clarification directly instead of streaming (backend stream returns wrong content)
        messages = [...messages, createMessage("assistant", clarificationMessage)];
        console.log('[Product Lookup] Added clarification message directly (no stream)');
      } else {
        // No match - offer to search for recommendations
        console.log('[Product Lookup] No match found');
        // Clear suggested names
        suggestedProductNames = [];
        messages = [...messages, createMessage("assistant", "I couldn't find that product in our inventory. Would you like me to search for recommendations?")];
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        console.log('[Product Lookup] Lookup aborted (new request started)');
        return;
      }
      console.error('[Product Lookup] Failed:', err);
      messages = [...messages, createMessage("assistant", "I'm having trouble finding that product right now. Could you tell me more about what you're looking for?")];
    } finally {
      productLookupInProgress = false;
      currentLookupController = null;
    }
  }

  // Stream response with product context
  async function streamWithProductContext(product: Recommendation | Record<string, any> | null, payload: { messages: Message[] }, reuseMessageIndex?: number | null) {
    console.log('[Product Context] Streaming with product:', product?.name);
    console.log('[Product Context] Reuse message index:', reuseMessageIndex);

    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = reuseMessageIndex !== undefined ? reuseMessageIndex : null;

    try {
      // Validate product has required fields
      if (product && (!product.name || product.name.trim() === '')) {
        console.error('[Product Context] Product missing name:', product);
        messages = [...messages, {
          role: 'assistant',
          content: 'I found a product but the data seems incomplete. Please try again.'
        }];
        return;
      }

      const resp = await fetch(`${BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          productContext: product ? JSON.stringify(product, null, 2) : null
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorMessage = product
          ? `I'm having trouble loading ${product.name}. Please try again.`
          : "I'm having trouble getting that information. Please try again.";
        messages = [...messages, {
          role: "assistant",
          content: errorMessage
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

              // Strip PRODUCT CONTEXT and debugging artifacts before displaying
              let cleanContent = botMessageContent;

              // Remove PRODUCT CONTEXT block and everything after it
              const productContextIndex = cleanContent.indexOf("**PRODUCT CONTEXT**");
              if (productContextIndex !== -1) {
                cleanContent = cleanContent.substring(0, productContextIndex).trim();
              }

              // Remove JSON code blocks (``` { ... } ```)
              cleanContent = cleanContent.replace(/```\s*\{[\s\S]*?\}\s*```/g, "").trim();

              // Remove any standalone ``` markers
              cleanContent = cleanContent.replace(/```/g, "").trim();

              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: cleanContent }];
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: cleanContent },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            console.error("[Product Context] Stream parse error:", err);
          }
        }

        buffer = parts[parts.length - 1];
      }

      console.log('[Product Context] Streaming completed');
      console.log('[Product Context] Final streaming index:', streamingMessageIndex);
      console.log('[Product Context] Product exists?', !!product);
      console.log('[Product Context] Streaming index not null?', streamingMessageIndex !== null);

      // After streaming completes, add the product card as a recommendation
      if (product && streamingMessageIndex !== null) {
        console.log('[Product Card] Building product recommendation from:', product);

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

        console.log('[Product Card] Product recommendation built:', productRecommendation);
        console.log('[Product Card] Current messages length:', messages.length);
        console.log('[Product Card] Inserting card at index:', streamingMessageIndex + 1);

        // Add product card message after the description
        messages = [
          ...messages.slice(0, streamingMessageIndex + 1),
          createMessage("assistant", "", { recommendations: [productRecommendation] }),
          ...messages.slice(streamingMessageIndex + 1)
        ];

        console.log('[Product Card] Card inserted successfully');
        console.log('[Product Card] New messages length:', messages.length);
        console.log('[Product Card] Card message:', messages[streamingMessageIndex + 1]);

        // Add to product registry for future lookups
        productRegistry.set(productRecommendation.id, productRecommendation);
        const normalizedName = productRecommendation.name.toLowerCase().replace(/[^\w\s]/g, '');
        productRegistry.set(`name:${normalizedName}`, productRecommendation);
        console.log('[Product Registry] Added product:', productRecommendation.name);
      } else {
        console.warn('[Product Card] Skipped - product:', product, 'streamingMessageIndex:', streamingMessageIndex);
      }
    } catch (err) {
      console.error("[Product Context] Stream failed:", err);
      const errorMessage = product && err instanceof Error
        ? `I had trouble loading ${product.name}. ${err.message}`
        : "I'm having trouble getting that information. Please try again.";
      messages = [...messages, {
        role: "assistant",
        content: errorMessage
      }];
    }
  }

  // Stream follow-up question for clarification
  async function streamFollowUp(clarificationMessage: string, payload: { messages: Message[] }, reuseMessageIndex?: number | null) {
    console.log('[Follow-up] Clarification message:', clarificationMessage);
    console.log('[Follow-up] Reuse message index:', reuseMessageIndex);

    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = reuseMessageIndex !== undefined ? reuseMessageIndex : null;

    try {
      const resp = await fetch(`${BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clarificationContext: clarificationMessage
        }),
      });

      console.log('[Follow-up] Stream response status:', resp.status, resp.ok);

      if (!resp.ok || !resp.body) {
        console.error('[Follow-up] Stream response not ok or no body, using fallback');
        messages = [...messages, {
          role: "assistant",
          content: clarificationMessage  // Fallback to showing the clarification directly
        }];
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      console.log('[Follow-up] Starting to read stream...');
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[Follow-up] Stream done, total tokens:', tokenCount);
          break;
        }

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
              tokenCount++;
              botMessageContent += token;

              // Strip PRODUCT CONTEXT and debugging artifacts before displaying
              let cleanContent = botMessageContent;

              // Remove PRODUCT CONTEXT block and everything after it
              const productContextIndex = cleanContent.indexOf("**PRODUCT CONTEXT**");
              if (productContextIndex !== -1) {
                cleanContent = cleanContent.substring(0, productContextIndex).trim();
              }

              // Remove JSON code blocks (``` { ... } ```)
              cleanContent = cleanContent.replace(/```\s*\{[\s\S]*?\}\s*```/g, "").trim();

              // Remove any standalone ``` markers
              cleanContent = cleanContent.replace(/```/g, "").trim();

              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: cleanContent }];
                console.log('[Follow-up] Created new message at index:', streamingMessageIndex);
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: cleanContent },
                  ...messages.slice(streamingMessageIndex + 1)
                ];
              }
            }
          } catch (err) {
            console.error("[Follow-up] Stream parse error:", err);
          }
        }

        buffer = parts[parts.length - 1];
      }

      // If stream completed but no content, fallback to showing clarification directly
      if (botMessageContent.trim() === '') {
        console.warn('[Follow-up] Stream completed but no content, using fallback');
        messages = [...messages, {
          role: "assistant",
          content: clarificationMessage
        }];
      }
    } catch (err) {
      console.error("[Follow-up] Stream failed:", err);
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

    // PRE-STREAM CHECK: If user says simple "yes" to clarification, bypass stream for efficiency
    if (suggestedProductNames.length > 0) {
      const queryLower = userMsg.toLowerCase().trim();
      const confirmationWords = ['yes', 'yea', 'yeah', 'yep', 'yup', 'sure'];
      const isSimpleConfirmation = confirmationWords.includes(queryLower);

      if (isSimpleConfirmation) {
        console.log('[Pre-Stream] Simple confirmation detected, bypassing stream and triggering product lookup directly');
        try {
          await handleProductQuestion(userMsg, payload);
        } finally {
          loading = false;
        }
        return;
      }
      // For specific responses (e.g., "wild cherry", "the second one"), let stream handle it
      // Stream will detect PRODUCT_LOOKUP CODEX and call handleProductQuestion
      // Then handleProductQuestion will call backend semantic search
    }

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
          console.error("Stream error:", errorData);
          const errorMessage = errorData.error || "Our streaming service is experiencing technical difficulties. Please try again.";
          messages = [...messages, {
            role: "assistant",
            content: errorMessage
          }];
        } catch (parseErr) {
          console.error("Failed to parse error:", parseErr);
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

              // Strip PRODUCT CONTEXT and debugging artifacts before displaying
              let cleanContent = fullStreamText;

              // Remove PRODUCT CONTEXT block and everything after it
              const productContextIndex = cleanContent.indexOf("**PRODUCT CONTEXT**");
              if (productContextIndex !== -1) {
                cleanContent = cleanContent.substring(0, productContextIndex).trim();
              }

              // Remove JSON code blocks (``` { ... } ```)
              cleanContent = cleanContent.replace(/```\s*\{[\s\S]*?\}\s*```/g, "").trim();

              // Remove any standalone ``` markers
              cleanContent = cleanContent.replace(/```/g, "").trim();

              // Create message only when we have the first token (avoid empty bubble)
              if (streamingMessageIndex === null) {
                streamingMessageIndex = messages.length;
                messages = [...messages, { role: "assistant", content: cleanContent }];
              } else {
                // Update the existing streaming message
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  { role: "assistant", content: cleanContent },
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

        // Replace shimmer with recommendations or friendly error message
        if (productRecommendations.length > 0) {
          // Add recommendations to product registry
          productRecommendations.forEach(product => {
            productRegistry.set(product.id, product);
            const normalizedName = product.name.toLowerCase().replace(/[^\w\s]/g, '');
            productRegistry.set(`name:${normalizedName}`, product);
          });
          console.log('[Product Registry] Added', productRecommendations.length, 'recommendations');

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
          // No recommendations found - show friendly message
          messages = [
            ...messages.slice(0, shimmerIndex),
            {
              role: "assistant",
              content: "I couldn't find any products matching those exact specifications. Try adjusting your preferences, or feel free to ask me about specific products!"
            },
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
      console.log('[CODEX] PRODUCT_LOOKUP detected, product name:', productName);
      console.log('[CODEX] Streaming message index:', streamingMessageIndex);
      console.log('[CODEX] Current messages length:', messages.length);

      if (productName) {
        // Don't clear the message - let the new stream overwrite it immediately
        // This prevents flickering as there's no visible gap
        console.log('[CODEX] Will reuse message index for product lookup stream');

        try {
          // Call product-lookup flow, passing the message index to reuse
          await handleProductQuestion(productName, { messages }, streamingMessageIndex);
        } finally {
          // Ensure loading state is cleared even if handleProductQuestion fails
          loading = false;
        }
        return; // Exit early, loading already cleared
      }
    }
    // No CODEX fallback - cards are ONLY inserted via explicit CODEX cues from stream

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
  onClose={() => (isOpen = false)}
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

    {#each messages as msg (msg.id || `fallback-${messages.indexOf(msg)}`)}
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
          showHoverActions={false}
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
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 0;
    padding-bottom: 0;
    margin-top: 20px;
    margin-bottom: 0;
    opacity: 0.8;
  }

  /* Mobile: move shimmer closer to left edge to match assistant messages */
  @media (max-width: 640px) {
    .shimmer-message {
      padding-left: 4px;
    }
  }
</style>
