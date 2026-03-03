<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
  import ShimmerText from "../../Svelte-Component-Library/src/lib/custom/ShimmerText/ShimmerText.svelte";
  import WelcomeQuickStart from "../../Svelte-Component-Library/src/lib/custom/WelcomeQuickStart/WelcomeQuickStart.svelte";
  import type { QuickStartRequest } from "../../Svelte-Component-Library/src/lib/custom/QuickStartPanel/QuickStartPanel.svelte";
  import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";
  import { getTHCScaleForCategory } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/thcScales.js";
  import { theme } from "./theme.svelte.js";

  import flowerIcon from "./icons/categories/flower.png";
  import prerollIcon from "./icons/categories/preroll.png";
  import vapeIcon from "./icons/categories/vape.png";
  import ediblesIcon from "./icons/categories/edibles.png";
  import concentrateIcon from "./icons/categories/concentrate.png";
  import concentrateTwoIcon from "./icons/categories/concentrate2.png";
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

  interface WidgetProps {
    store?: string;
    apiBase?: string;
  }

  const envStoreName = import.meta.env.VITE_STORE_NAME;
  const envApiBase = import.meta.env.VITE_API_URL;
  let {
    store = envStoreName ?? window.location.hostname ?? "demo-store",
    apiBase = envApiBase ?? "http://localhost:8787"
  }: WidgetProps = $props();

  let isOpen = $state(false);
  let mode = $state<'chat' | 'guided-flow'>('chat');

  const BASE_URL = apiBase.replace(/\/chat\/?$/, "").replace(/\/$/, "");
  const CHAT_BASE_URL = `${BASE_URL}/chat`;

  let isInitialized = $state(false);

  const persistChat = false; // Set to true to re-enable localStorage persistence

  const STORAGE_KEY = `widget_chat_${store}`;
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
  // Removed productRegistry - stream has full conversation history and handles all intelligence

  // Prevent concurrent product lookups
  let productLookupInProgress = $state(false);

  // Abort controller for canceling previous lookups
  let currentLookupController: AbortController | null = null;

  // Store suggested product names from clarification for next query
  // Removed suggestedProductNames - stream handles all clarification intelligence

  // Track retry attempts for increasing search scope
  let retryAttempts = 0;

  // Removed FuzzyResult interface - no longer needed

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
      "I'll pull up the details",
      "Getting more details on"
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
    console.log('[Extract] Attempting to extract from:', text);

    // FOOLPROOF EXTRACTION: Product names are wrapped in double quotes
    // This handles ANY product name including periods, commas, special characters
    const quoteMatch = text.match(/"([^"]+)"/);
    if (quoteMatch && quoteMatch[1].trim()) {
      console.log('[Extract] Extracted from quotes:', quoteMatch[1].trim());
      return quoteMatch[1].trim();
    }

    console.log('[Extract] No quoted product name found - extraction failed!');
    return null;
  }

  // Removed fuzzyFindProduct - stream has conversation history and handles all product matching

  // Sidebar links for disclosures and feedback pages
  const medicalDisclosureIcon = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/>
    <path d="M10 6V14M6 10H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;

  const menuItems = [
    { id: 'ai-disclosure', label: 'AI Disclosure', icon: 'about', iconType: 'svg' as const },
    { id: 'medical-disclosure', label: 'Medical Disclosure', icon: medicalDisclosureIcon, iconType: 'svg' as const },
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const }
  ];

  type PanelId = 'ai-disclosure' | 'medical-disclosure' | 'feedback';
  let activePanel = $state<PanelId | null>(null);
  let feedbackName = $state('');
  let feedbackEmail = $state('');
  let feedbackType = $state<'bug' | 'quality' | 'safety' | 'other'>('quality');
  let feedbackMessage = $state('');
  let feedbackNotice = $state('');
  let feedbackNoticeType = $state<'success' | 'error' | null>(null);
  let feedbackSending = $state(false);
  let feedbackScreenshotFile = $state<File | null>(null);
  let feedbackScreenshotPreview = $state('');
  const popularRequests: QuickStartRequest[] = [
    { label: 'Potent Flower', prompt: 'potent flower', icon: flowerIcon },
    { label: 'Uplifting Vape', prompt: 'uplifting vape', icon: vapeIcon },
    { label: 'Sleepy Edibles', prompt: 'sleepy edibles', icon: gummiesIcon },
    { label: 'Calm Pre-Rolls', prompt: 'calm pre-rolls', icon: prerollIcon },
    { label: 'CBD Oil', prompt: 'cbd oil', icon: concentrateTwoIcon },
    { label: 'Berry Gummies', prompt: 'berry gummies', icon: gummiesIcon }
  ];

  const menuRoutes: Record<string, string> = {
    'ai-disclosure': '/disclosures/ai-disclosure.html',
    'medical-disclosure': '/disclosures/medical-disclosure.html',
    feedback: '/support/feedback.html'
  };

  function handleMenuItemClick(itemId: string) {
    if (itemId === 'ai-disclosure' || itemId === 'medical-disclosure' || itemId === 'feedback') {
      activePanel = itemId;
    }
  }

  function openExternalPanelPage(panelId: PanelId) {
    const path = menuRoutes[panelId];
    if (!path) return;
    const url = new URL(path, window.location.origin);
    if (panelId === 'feedback') {
      url.searchParams.set('store', store);
      if (BASE_URL) {
        url.searchParams.set('api', BASE_URL);
      }
      url.searchParams.set('source', 'external-page');
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  function closePanel() {
    activePanel = null;
    feedbackNotice = '';
    feedbackNoticeType = null;
    removeFeedbackScreenshot();
  }

  function handleFeedbackScreenshotChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (feedbackScreenshotPreview) {
      URL.revokeObjectURL(feedbackScreenshotPreview);
      feedbackScreenshotPreview = '';
    }

    if (!file) {
      feedbackScreenshotFile = null;
      return;
    }

    feedbackScreenshotFile = file;
    feedbackScreenshotPreview = URL.createObjectURL(file);
  }

  function removeFeedbackScreenshot() {
    if (feedbackScreenshotPreview) {
      URL.revokeObjectURL(feedbackScreenshotPreview);
    }
    feedbackScreenshotFile = null;
    feedbackScreenshotPreview = '';
  }

  async function submitFeedback() {
    if (feedbackSending) return;
    if (!feedbackMessage.trim()) {
      feedbackNotice = 'Please add a message before sending feedback.';
      feedbackNoticeType = 'error';
      return;
    }

    feedbackSending = true;
    feedbackNotice = '';
    feedbackNoticeType = null;

    try {
      const formData = new FormData();
      formData.set('name', feedbackName.trim());
      formData.set('email', feedbackEmail.trim());
      formData.set('type', feedbackType);
      formData.set('message', feedbackMessage.trim());
      formData.set('store', store);
      formData.set('source', 'widget');
      formData.set('pageUrl', window.location.href);
      formData.set('userAgent', navigator.userAgent);
      if (feedbackScreenshotFile) {
        formData.set('screenshot', feedbackScreenshotFile);
      }

      const resp = await fetch(`${BASE_URL}/feedback`, {
        method: 'POST',
        body: formData
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.message || data?.error || 'Unable to send feedback right now.');
      }

      feedbackNotice = 'Thanks, your feedback has been sent successfully.';
      feedbackNoticeType = 'success';
      feedbackName = '';
      feedbackEmail = '';
      feedbackType = 'quality';
      feedbackMessage = '';
      removeFeedbackScreenshot();
    } catch (err) {
      feedbackNotice = err instanceof Error ? err.message : 'Unable to send feedback right now.';
      feedbackNoticeType = 'error';
    } finally {
      feedbackSending = false;
    }
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

  onDestroy(() => {
    if (feedbackScreenshotPreview) {
      URL.revokeObjectURL(feedbackScreenshotPreview);
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

  function handlePopularRequest(request: QuickStartRequest) {
    void handleChat(request.prompt);
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
        `${CHAT_BASE_URL}/recommendations`,
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
        // Removed productRegistry - stream has conversation history

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
  // PRODUCT QUESTION HANDLER (SIMPLIFIED - STREAM HANDLES INTELLIGENCE)
  // ------------------------------------------------------
  async function handleProductQuestion(productQuery: string, payload: { messages: Message[] }) {
    console.log('[Product Lookup] Query:', productQuery);

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

      // STEP 1: Call backend semantic search - WAIT FOR COMPLETION
      console.log('[Product Lookup] Calling backend API with query:', productQuery);
      const lookupResp = await fetch(`${CHAT_BASE_URL}/product-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_query: productQuery,
          retry_attempt: retryAttempts
        }),
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

      // STEP 2: Handle result based on backend decision - SEQUENTIAL, NO OVERLAP

      if (lookupResult.product) {
        // Backend found a confident match - stream with product context
        console.log('[Product Lookup] Product found (confidence:', lookupResult.confidence, '), streaming with context');
        retryAttempts = 0; // Reset retry counter on success

        // Stream product details - WAIT FOR COMPLETION
        await streamWithProductContext(lookupResult.product, payload);

      } else if (lookupResult.needsClarification) {
        // Low/medium confidence - show clarification question
        console.log('[Product Lookup] Needs clarification, streaming clarification context');

        // Stream the clarification question - WAIT FOR COMPLETION
        await streamFollowUp(lookupResult.message, payload);

      } else {
        // No match - offer to search for recommendations
        console.log('[Product Lookup] No match found');
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
  async function streamWithProductContext(product: Recommendation | Record<string, any> | null, payload: { messages: Message[] }) {
    console.log('[Product Context] Streaming with product:', product?.name);

    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = null;  // Always append NEW message

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

      const resp = await fetch(`${CHAT_BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          productContext: product ? JSON.stringify(product, null, 2) : null
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorText = !resp.ok ? await resp.text().catch(() => "") : "";
        console.error("[Product Context] Stream request failed", {
          url: `${CHAT_BASE_URL}/stream`,
          status: resp.status,
          statusText: resp.statusText,
          hasBody: !!resp.body,
          responseText: errorText
        });
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

      // Stream has completed - now insert product card
      console.log('[Product Context] Streaming completed');
      console.log('[Product Context] Final streaming index:', streamingMessageIndex);

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

        // Insert product card immediately after the streaming message
        messages = [
          ...messages.slice(0, streamingMessageIndex + 1),
          createMessage("assistant", "", { recommendations: [productRecommendation] }),
          ...messages.slice(streamingMessageIndex + 1)
        ];

        console.log('[Product Card] Card inserted at index:', streamingMessageIndex + 1);
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
  async function streamFollowUp(clarificationMessage: string, payload: { messages: Message[] }) {
    console.log('[Follow-up] Clarification message:', clarificationMessage);
    console.log('[Follow-up] Payload messages count:', payload.messages.length);
    console.log('[Follow-up] Sending clarificationContext:', clarificationMessage);

    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = null;  // Always append NEW message

    try {
      const requestBody = {
        ...payload,
        clarificationContext: clarificationMessage
      };
      console.log('[Follow-up] Request body keys:', Object.keys(requestBody));
      console.log('[Follow-up] clarificationContext in body:', requestBody.clarificationContext);

      const resp = await fetch(`${CHAT_BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('[Follow-up] Stream response status:', resp.status, resp.ok);

      if (!resp.ok || !resp.body) {
        const errorText = !resp.ok ? await resp.text().catch(() => "") : "";
        console.error("[Follow-up] Stream request failed", {
          url: `${CHAT_BASE_URL}/stream`,
          status: resp.status,
          statusText: resp.statusText,
          hasBody: !!resp.body,
          responseText: errorText
        });
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

      console.log('[Follow-up] Completed successfully');
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

    // STREAM-FIRST ARCHITECTURE - Let stream handle ALL intelligence
    // Stream detects confirmations, clarifications, rejections, and emits appropriate CODEX cues
    // STEP 1: Stream immediately (instant feedback)
    let fullStreamText = "";
    let streamingMessageIndex: number | null = null;
    let buffer = "";
    let codexDetectedMidStream = false;  // Flag to stop streaming when CODEX detected

    try {
      const resp = await fetch(`${CHAT_BASE_URL}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check for error response before trying to read as stream
      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "");
        console.error("[Chat] Stream request failed", {
          url: `${CHAT_BASE_URL}/stream`,
          status: resp.status,
          statusText: resp.statusText,
          responseText: errorText
        });
        try {
          const errorData = errorText ? JSON.parse(errorText) : {};
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

              // REAL-TIME CODEX DETECTION - Stop stream when we have COMPLETE cue
              // A complete cue has: pattern + quoted product name + ending phrase
              const codex = detectCodex(fullStreamText);
              if (codex) {
                // Check if we have a COMPLETE cue (has quotes and proper ending)
                const hasQuotedProduct = /"[^"]+"/i.test(fullStreamText);
                const hasProperEnding = fullStreamText.trim().endsWith('for you.') ||
                                       fullStreamText.trim().endsWith('Just a moment please.');

                if (hasQuotedProduct && hasProperEnding) {
                  console.log('[STREAM] COMPLETE CODEX cue detected:', codex);
                  console.log('[STREAM] Stopping stream to prevent hallucination');

                  // Update UI with final token BEFORE breaking
                  if (streamingMessageIndex !== null) {
                    messages[streamingMessageIndex].content = fullStreamText;
                    messages = [...messages];
                  }

                  codexDetectedMidStream = true;
                  break;
                } else {
                  console.log('[STREAM] Partial CODEX detected, waiting for completion...');
                }
              }

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

        // If CODEX detected, stop reading stream immediately
        if (codexDetectedMidStream) {
          console.log('[STREAM] Breaking out of stream read loop');
          break;
        }
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

        const intentResp = await fetch(`${CHAT_BASE_URL}/intent`, {
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
        const recResp = await fetch(`${CHAT_BASE_URL}/recommendations`, {
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
          // Removed productRegistry - stream has conversation history

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
      console.log('[CODEX] Current messages length:', messages.length);

      if (productName) {
        console.log('[CODEX] Starting product lookup flow (will append new messages, preserving cue)');

        try {
          // Call product-lookup flow - it will append new messages
          await handleProductQuestion(productName, { messages });
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
  onClose={() => {
    isOpen = false;
    closePanel();
  }}
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
  hasMessages={activePanel === null && messages.length > 0}
  clearButtonIcon="erase"
  mode={mode}
  onModeToggle={activePanel === null ? handleModeToggle : undefined}
  modeTogglePosition="lower-left"
  guidedFlowConfig={mode === 'guided-flow' ? guidedFlowConfig : undefined}
  messagesCount={messages.length}
  darkMode={true}
  noAssistantBubble={true}
  showInput={activePanel === null}
>
  {#snippet children()}
    {#if activePanel === null}
      {#if messages.length === 0}
        <WelcomeQuickStart
          requests={popularRequests}
          {loading}
          onRequestSelect={handlePopularRequest}
        />
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
    {:else}
      <section class="widget-panel" class:widget-panel--feedback={activePanel === 'feedback'}>
        <div class="widget-panel__top">
          <button type="button" class="widget-panel__back" onclick={closePanel} aria-label="Back to chat">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button type="button" class="widget-panel__external-link" onclick={() => openExternalPanelPage(activePanel)}>
            Full Page
          </button>
        </div>

        {#if activePanel === 'ai-disclosure'}
          <h3>AI Assistant Disclosure</h3>
          <p>This assistant is experimental. Responses are generated automatically and may be incomplete, inaccurate, or outdated.</p>
          <ul>
            <li>Use guidance as informational, not guaranteed advice.</li>
            <li>Verify key product details with in-store staff before purchase.</li>
            <li>This assistant does not provide medical diagnosis or treatment advice.</li>
          </ul>
          <p class="widget-panel__note">For urgent health concerns, contact a licensed medical professional or call 911.</p>
        {:else if activePanel === 'medical-disclosure'}
          <h3>Medical and Recreational Disclosure</h3>
          <p>Cannavita is a recreational dispensary. Content in this widget is for retail and educational purposes only.</p>
          <ul>
            <li>No statements here diagnose, treat, cure, or prevent disease.</li>
            <li>Consult a licensed healthcare professional for medical questions.</li>
            <li>Do not drive or operate machinery while impaired.</li>
            <li>Keep all cannabis products away from children and pets.</li>
          </ul>
        {:else if activePanel === 'feedback'}
          <h3>Send Feedback</h3>
          <p>Share bugs, safety concerns, or recommendation quality issues.</p>

          <form class="feedback-form" onsubmit={(event) => { event.preventDefault(); submitFeedback(); }}>
            <div class="feedback-form__row">
              <label>
                Name (optional)
                <input type="text" bind:value={feedbackName} disabled={feedbackSending} />
              </label>
              <label>
                Email (optional)
                <input type="email" bind:value={feedbackEmail} disabled={feedbackSending} />
              </label>
            </div>
            <label>
              Feedback type
              <select bind:value={feedbackType} disabled={feedbackSending}>
                <option value="bug">Bug report</option>
                <option value="quality">Recommendation quality</option>
                <option value="safety">Safety/medical concern</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Message
              <textarea bind:value={feedbackMessage} placeholder="Tell us what happened and what should improve." required disabled={feedbackSending}></textarea>
            </label>
            <label>
              Screenshot (optional)
              <input type="file" accept="image/*" onchange={handleFeedbackScreenshotChange} disabled={feedbackSending} />
            </label>
            {#if feedbackScreenshotPreview}
              <div class="feedback-screenshot">
                <img src={feedbackScreenshotPreview} alt="Feedback screenshot preview" />
                <button type="button" class="feedback-screenshot__remove" onclick={removeFeedbackScreenshot} disabled={feedbackSending}>Remove screenshot</button>
              </div>
            {/if}
            <button type="submit" class="feedback-form__submit" disabled={feedbackSending}>
              {feedbackSending ? 'Sending...' : 'Send Feedback'}
            </button>
          </form>

          {#if feedbackNotice}
            <p class="widget-panel__note" class:widget-panel__note--error={feedbackNoticeType === 'error'}>{feedbackNotice}</p>
          {/if}
        {/if}
      </section>
    {/if}
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

  .widget-panel {
    height: 100%;
    padding: 14px 12px 14px;
    color: #ebebeb;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .widget-panel h3 {
    margin: 8px 0 4px;
    font-size: 1rem;
    color: #f5f5f5;
  }

  .widget-panel p,
  .widget-panel li {
    color: #d2d2d2;
    font-size: 0.85rem;
    line-height: 1.35;
  }

  .widget-panel ul {
    margin: 8px 0 0;
    padding-left: 18px;
  }

  .widget-panel__top {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin-top: 6px;
    margin-bottom: 10px;
    padding-right: 54px;
  }

  .widget-panel__back,
  .feedback-form__submit {
    border: 1px solid #4f4f4f;
    border-radius: 8px;
    background: #2d2d2d;
    color: #f1f1f1;
    padding: 6px 9px;
    font-size: 0.76rem;
    cursor: pointer;
  }

  .widget-panel__back {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: rgba(45, 45, 48, 0.95);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .widget-panel__back:hover {
    filter: brightness(1.1);
  }

  .widget-panel__external-link {
    border: none;
    background: transparent;
    color: #71d0c2;
    font-size: 0.82rem;
    line-height: 1;
    padding: 8px 2px;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  .widget-panel__external-link:hover {
    color: #8fe0d3;
  }

  .feedback-form {
    display: grid;
    gap: 8px;
    margin-top: 8px;
  }

  .feedback-form label {
    display: grid;
    gap: 3px;
    font-size: 0.78rem;
    color: #d8d8d8;
  }

  .feedback-form__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .feedback-form input,
  .feedback-form select,
  .feedback-form textarea {
    border: 1px solid #4f4f4f;
    border-radius: 8px;
    background: #212121;
    color: #f1f1f1;
    font: inherit;
    padding: 7px 9px;
  }

  .feedback-form textarea {
    min-height: 68px;
    max-height: 96px;
    resize: vertical;
  }

  .feedback-form input[type="file"] {
    font-size: 0.76rem;
    padding: 6px 8px;
  }

  .feedback-form input[type="file"]::file-selector-button {
    margin-right: 8px;
    border: 1px solid #2e6d64;
    border-radius: 7px;
    background: #1f433e;
    color: #e9f8f4;
    padding: 6px 10px;
    font-size: 0.74rem;
    cursor: pointer;
  }

  .feedback-form input[type="file"]::file-selector-button:hover {
    filter: brightness(1.08);
  }

  .feedback-screenshot {
    display: grid;
    gap: 8px;
  }

  .feedback-screenshot img {
    max-width: 100%;
    max-height: 88px;
    object-fit: contain;
    border-radius: 8px;
    border: 1px solid #4f4f4f;
    background: #171717;
  }

  .feedback-screenshot__remove {
    justify-self: start;
    border: 1px solid #4f4f4f;
    border-radius: 8px;
    background: #2d2d2d;
    color: #f1f1f1;
    padding: 5px 9px;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .widget-panel__note {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #3b5f58;
    background: #1c312d;
    color: #bde3da;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .widget-panel__note--error {
    border-color: #6a4343;
    background: #351f1f;
    color: #f0c4c4;
  }

  .feedback-form__submit:disabled,
  .feedback-screenshot__remove:disabled,
  .feedback-form input:disabled,
  .feedback-form select:disabled,
  .feedback-form textarea:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  @media (max-width: 430px) {
    .feedback-form__row {
      grid-template-columns: 1fr;
    }
  }

  .widget-panel--feedback h3 {
    margin-top: 0;
    margin-bottom: 8px;
  }

  .widget-panel--feedback > p {
    margin-top: 0;
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .widget-panel--feedback {
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 18px;
    min-height: 0;
    overscroll-behavior: contain;
  }

  /* Mobile: move shimmer closer to left edge to match assistant messages */
  @media (max-width: 640px) {
    .shimmer-message {
      padding-left: 4px;
    }
  }
</style>
