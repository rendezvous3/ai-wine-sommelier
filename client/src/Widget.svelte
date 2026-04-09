<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import ChatWidget from "../../Svelte-Component-Library/src/lib/custom/ChatWidget/ChatWidget.svelte";
  import ChatMessage from "../../Svelte-Component-Library/src/lib/custom/ChatMessage/ChatMessage.svelte";
  import ShimmerText from "../../Svelte-Component-Library/src/lib/custom/ShimmerText/ShimmerText.svelte";
  import WelcomeQuickStart from "../../Svelte-Component-Library/src/lib/custom/WelcomeQuickStart/WelcomeQuickStart.svelte";
  import type { QuickStartRequest } from "../../Svelte-Component-Library/src/lib/custom/QuickStartPanel/QuickStartPanel.svelte";
  import type { GuidedFlowConfig } from "../../Svelte-Component-Library/src/lib/custom/GuidedFlow/types.js";
  import type { WidgetPosition } from "./embed-config";
  import {
    WIDGET_CLOSE_EVENT,
    WIDGET_OPEN_EVENT,
    WIDGET_ROOT_ID,
    dispatchWidgetLifecycleEvent,
    subscribeToWidgetCommands
  } from "./embed-bridge";
  import { theme } from "./theme.svelte.js";

  import chatIcon from "./icons/assistant/chat.png";

  // Wine SVG icons (inline for POC — no external icon files needed)
  const wineRedIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6C16 6 12 14 12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20C28 14 24 6 20 6Z" fill="#8B2252"/><rect x="18.5" y="28" width="3" height="6" rx="1" fill="currentColor"/><rect x="14" y="33" width="12" height="2" rx="1" fill="currentColor"/></svg>';
  const wineWhiteIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6C16 6 12 14 12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20C28 14 24 6 20 6Z" fill="#F0E68C"/><rect x="18.5" y="28" width="3" height="6" rx="1" fill="currentColor"/><rect x="14" y="33" width="12" height="2" rx="1" fill="currentColor"/></svg>';
  const wineRoseIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6C16 6 12 14 12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20C28 14 24 6 20 6Z" fill="#FFB6C1"/><rect x="18.5" y="28" width="3" height="6" rx="1" fill="currentColor"/><rect x="14" y="33" width="12" height="2" rx="1" fill="currentColor"/></svg>';
  const wineSparklingIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6C16 6 12 14 12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20C28 14 24 6 20 6Z" fill="#E8E8A0"/><circle cx="16" cy="16" r="1" fill="white" opacity="0.8"/><circle cx="22" cy="14" r="1.2" fill="white" opacity="0.6"/><circle cx="19" cy="19" r="0.8" fill="white" opacity="0.7"/><rect x="18.5" y="28" width="3" height="6" rx="1" fill="currentColor"/><rect x="14" y="33" width="12" height="2" rx="1" fill="currentColor"/></svg>';
  const wineDessertIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6C16 6 12 14 12 20C12 24.4 15.6 28 20 28C24.4 28 28 24.4 28 20C28 14 24 6 20 6Z" fill="#DAA520"/><rect x="18.5" y="28" width="3" height="6" rx="1" fill="currentColor"/><rect x="14" y="33" width="12" height="2" rx="1" fill="currentColor"/></svg>';
  const wineSurpriseIcon = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="14" fill="none" stroke="currentColor" stroke-width="2"/><text x="20" y="26" text-anchor="middle" fill="currentColor" font-size="18" font-weight="bold">?</text></svg>';

  // Flavor family icons (simple colored circles for POC)
  const flavorBerryIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#C41E3A"/></svg>';
  const flavorCitrusIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#FFD700"/></svg>';
  const flavorTropicalIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#FF8C00"/></svg>';
  const flavorChocolateIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#5C3317"/></svg>';
  const flavorVanillaIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#F3E5AB"/></svg>';
  const flavorPepperIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#B22222"/></svg>';
  const flavorFloralIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#DDA0DD"/></svg>';
  const flavorEarthyIcon = '<svg width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#8B7355"/></svg>';

  interface WidgetProps {
    store?: string;
    apiBase?: string;
    position?: WidgetPosition;
    offsetX?: string;
    offsetY?: string;
    zIndex?: number;
    width?: string;
    height?: string;
    launcherIcon?: string;
    launcherLabel?: string;
    launcherBg?: string;
    hideLauncher?: boolean;
    onOpenStateChange?: (isOpen: boolean) => void;
  }

  const envStoreName = import.meta.env.VITE_STORE_NAME;
  const envApiBase = import.meta.env.VITE_API_URL;
  let {
    store = envStoreName ?? window.location.hostname ?? "demo-store",
    apiBase = envApiBase ?? "http://localhost:8787",
    position = 'bottom-right',
    offsetX = '20px',
    offsetY = '20px',
    zIndex = 2147483000,
    width = '426px',
    height = '702px',
    launcherIcon,
    launcherLabel = 'Open chat widget',
    launcherBg,
    hideLauncher = false,
    onOpenStateChange
  }: WidgetProps = $props();

  let isOpen = $state(false);
  let mode = $state<'chat' | 'guided-flow'>('chat');

  let BASE_URL = $derived(apiBase.replace(/\/chat\/?$/, "").replace(/\/$/, ""));
  let CHAT_BASE_URL = $derived(`${BASE_URL}/chat`);

  let isInitialized = $state(false);

  const persistChat = false; // Set to true to re-enable localStorage persistence

  let STORAGE_KEY = $derived(`widget_chat_${store}`);
  let ANALYTICS_SESSION_KEY = $derived(`widget_chat_session_${store}`);
  let ANALYTICS_SESSION_LAST_ACTIVITY_KEY = $derived(`widget_chat_session_last_activity_${store}`);
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  interface Message {
    role: "user" | "assistant";
    content: string;
    recommendations?: Recommendation[];
    shimmer?: boolean;  // Add shimmer flag for loading messages
    id?: string;  // Unique identifier for Svelte keying
    analyticsMessageId?: string;
  }

  // Counter for generating unique message IDs
  let messageIdCounter = 0;

  interface Recommendation {
    id: string;
    name: string;
    price: number;
    image?: string;
    image_url?: string;
    shop_link?: string;
    description?: string;
    wine_type?: string;
    varietal?: string;
    region?: string;
    vintage?: number;
    body?: string;
    sweetness?: string;
    tasting_notes?: string;
    flavor_profile?: string[];
    food_pairings?: string[];
    occasions?: string[];
    brand?: string;
    alcohol_pct?: number;
    rankPosition?: number;
  }

  interface AnalyticsContextPayload {
    session_id: string;
    message_id: string;
    source_page: string;
    store_id: string;
  }

  let messages = $state<Message[]>([]);
  let input = $state("");
  let loading = $state(false);
  let analyticsSessionId = $state<string | null>(null);

  // Helper function to create messages with unique IDs
  function createMessage(role: "user" | "assistant", content: string, extras?: Partial<Message>): Message {
    return {
      id: `msg-${Date.now()}-${messageIdCounter++}`,
      role,
      content,
      ...extras
    };
  }

  function updateAnalyticsSessionActivity(timestamp = Date.now()) {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(ANALYTICS_SESSION_LAST_ACTIVITY_KEY, String(timestamp));
  }

  function getOrCreateAnalyticsSessionId(forceNew = false): string {
    const now = Date.now();

    if (!forceNew && analyticsSessionId) {
      updateAnalyticsSessionActivity(now);
      return analyticsSessionId;
    }

    const lastActivityRaw = sessionStorage.getItem(ANALYTICS_SESSION_LAST_ACTIVITY_KEY);
    const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : null;
    const existingSessionId = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    const shouldRotate = forceNew || !existingSessionId || !lastActivity || (now - lastActivity) > SESSION_TIMEOUT_MS;
    const nextSessionId = shouldRotate ? crypto.randomUUID() : existingSessionId;

    analyticsSessionId = nextSessionId;
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, nextSessionId);
    updateAnalyticsSessionActivity(now);
    return nextSessionId;
  }

  function createAnalyticsContext(messageId = crypto.randomUUID()): AnalyticsContextPayload {
    return {
      session_id: getOrCreateAnalyticsSessionId(),
      message_id: messageId,
      source_page: window.location.pathname,
      store_id: store
    };
  }

  async function sendAnalyticsEvent(
    eventType: string,
    options: {
      messageId?: string | null;
      productId?: string | null;
      rankPosition?: number | null;
      payload?: Record<string, unknown>;
      useBeacon?: boolean;
      sessionId?: string | null;
    } = {}
  ) {
    const sessionId = options.sessionId ?? analyticsSessionId;
    if (!sessionId) return;

    updateAnalyticsSessionActivity();

    const body = JSON.stringify({
      event_id: crypto.randomUUID(),
      session_id: sessionId,
      message_id: options.messageId ?? null,
      event_type: eventType,
      product_id: options.productId ?? null,
      rank_position: options.rankPosition ?? null,
      payload: options.payload ?? {},
      occurred_at: new Date().toISOString()
    });

    const url = `${CHAT_BASE_URL}/analytics/event`;
    if (options.useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: options.useBeacon === true
      });
    } catch (error) {
      console.warn('[Analytics] Event send failed:', error);
    }
  }

  function resetAnalyticsSession() {
    analyticsSessionId = null;
    sessionStorage.removeItem(ANALYTICS_SESSION_KEY);
    sessionStorage.removeItem(ANALYTICS_SESSION_LAST_ACTIVITY_KEY);
  }

  let productRecommendations = $state<Recommendation[]>([]);
  let suppressOpenUntil = $state(0);

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
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const },
    { id: 'feedback', label: 'Send Feedback', icon: 'feedback', iconType: 'svg' as const }
  ];

  type PanelId =
    | 'ai-disclosure'
    | 'medical-disclosure'
    | 'feedback';
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
  let panelRef = $state<HTMLElement | null>(null);
  let panelBackButtonRef = $state<HTMLButtonElement | null>(null);
  let lastFocusedElement = $state<HTMLElement | null>(null);
  let a11yAnnouncement = $state('');
  const popularRequests: QuickStartRequest[] = [
    { label: 'Bold Red', prompt: 'full-bodied red wine' },
    { label: 'Crisp White', prompt: 'crisp white wine' },
    { label: 'Date Night', prompt: 'wine for date night' },
    { label: 'Under $25', prompt: 'good wine under $25' },
    { label: 'Sparkling', prompt: 'sparkling wine for celebration' },
    { label: 'Surprise Me', prompt: 'surprise me' }
  ];

  const menuRoutes: Record<string, string> = {
    'ai-disclosure': '/disclosures/ai-disclosure.html',
    'medical-disclosure': '/disclosures/medical-disclosure.html',
    feedback: '/support/feedback.html',
  };

  // Guide data removed — cannabis terpene/cannabinoid guides not applicable to wine POC

  function getWidgetShadowRoot(): ShadowRoot | null {
    return document.getElementById(WIDGET_ROOT_ID)?.shadowRoot ?? null;
  }

  function dismissActivePanel({
    restoreFocus = true,
    announce = true
  }: {
    restoreFocus?: boolean;
    announce?: boolean;
  } = {}) {
    const closingPanel = activePanel;
    if (!closingPanel) return;

    activePanel = null;
    feedbackNotice = '';
    feedbackNoticeType = null;
    removeFeedbackScreenshot();

    if (announce) {
      a11yAnnouncement = `${menuItems.find((item) => item.id === closingPanel)?.label ?? 'Panel'} closed.`;
    }

    if (restoreFocus) {
      requestAnimationFrame(() => {
        lastFocusedElement?.focus();
        lastFocusedElement = null;
      });
    } else {
      lastFocusedElement = null;
    }
  }

  async function trackSessionClosed(reason: string, useBeacon = false) {
    await sendAnalyticsEvent('session_closed', {
      payload: { reason },
      useBeacon
    });
  }

  function openWidget(force = false) {
    if (isOpen) return;
    if (!force && Date.now() < suppressOpenUntil) return;
    isOpen = true;
  }

  function closeWidget(reason = 'widget_closed') {
    if (!isOpen) return;
    suppressOpenUntil = Date.now() + 250;
    void trackSessionClosed(reason, reason === 'visibility_hidden' || reason === 'pagehide' || reason === 'widget_destroyed');
    dismissActivePanel({ restoreFocus: false, announce: false });
    isOpen = false;
  }

  function toggleWidget() {
    if (isOpen) {
      closeWidget('widget_toggle_close');
      return;
    }
    openWidget();
  }


  function handleMenuItemClick(itemId: string) {
    if (itemId === 'menu-section-guides') return;
    if (
      itemId === 'ai-disclosure' ||
      itemId === 'medical-disclosure' ||
      itemId === 'feedback'
    ) {
      if (document.activeElement instanceof HTMLElement) {
        lastFocusedElement = document.activeElement;
      }
      activePanel = itemId;
      a11yAnnouncement = `${menuItems.find((item) => item.id === itemId)?.label ?? 'Panel'} opened.`;
      requestAnimationFrame(() => {
        const shadowRoot = getWidgetShadowRoot();
        const container = shadowRoot?.querySelector('.chat-window__messages') as HTMLElement | null;
        if (container) container.scrollTop = 0;
        panelBackButtonRef?.focus();
      });
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
    dismissActivePanel();
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
      a11yAnnouncement = feedbackNotice;
      return;
    }

    feedbackSending = true;
    feedbackNotice = '';
    feedbackNoticeType = null;

    try {
      const submittedFeedbackType = feedbackType;
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
      a11yAnnouncement = feedbackNotice;
      feedbackName = '';
      feedbackEmail = '';
      feedbackType = 'quality';
      feedbackMessage = '';
      removeFeedbackScreenshot();
      void sendAnalyticsEvent('feedback_submitted', {
        payload: {
          feedback_type: submittedFeedbackType,
          source: 'widget'
        }
      });
    } catch (err) {
      feedbackNotice = err instanceof Error ? err.message : 'Unable to send feedback right now.';
      feedbackNoticeType = 'error';
      a11yAnnouncement = feedbackNotice;
    } finally {
      feedbackSending = false;
    }
  }


  onMount(() => {
    const existingSessionId = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    const lastActivityRaw = sessionStorage.getItem(ANALYTICS_SESSION_LAST_ACTIVITY_KEY);
    const lastActivity = lastActivityRaw ? Number(lastActivityRaw) : null;
    if (existingSessionId && lastActivity && (Date.now() - lastActivity) <= SESSION_TIMEOUT_MS) {
      analyticsSessionId = existingSessionId;
      updateAnalyticsSessionActivity();
    }

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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void trackSessionClosed('visibility_hidden', true);
      }
    };

    const handlePageHide = () => {
      void trackSessionClosed('pagehide', true);
    };

    const unsubscribeWidgetCommands = subscribeToWidgetCommands((command) => {
      if (command === 'open') {
        openWidget(true);
        return;
      }
      if (command === 'close') {
        closeWidget('api_close');
        return;
      }
      toggleWidget();
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      unsubscribeWidgetCommands();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  });

  let lastOpenState = $state<boolean | null>(null);

  $effect(() => {
    onOpenStateChange?.(isOpen);

    if (lastOpenState === null) {
      lastOpenState = isOpen;
      return;
    }

    if (lastOpenState === isOpen) return;

    dispatchWidgetLifecycleEvent(
      isOpen ? WIDGET_OPEN_EVENT : WIDGET_CLOSE_EVENT,
      { isOpen }
    );
    lastOpenState = isOpen;
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
    void trackSessionClosed('widget_destroyed', true);
  });

  function getPanelFocusableElements(): HTMLElement[] {
    if (!panelRef) return [];
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    return Array.from(panelRef.querySelectorAll<HTMLElement>(selectors)).filter((el) => {
      return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
    });
  }

  $effect(() => {
    if (!activePanel) return;
    const shadowRoot = getWidgetShadowRoot();
    if (!shadowRoot) return;

    function handlePanelKeydown(event: KeyboardEvent) {
      if (!activePanel) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getPanelFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        panelBackButtonRef?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = shadowRoot.activeElement as HTMLElement | null;
      const isShift = event.shiftKey;
      const activeWithinPanel = activeElement ? panelRef?.contains(activeElement) : false;

      if (!activeWithinPanel) {
        event.preventDefault();
        (isShift ? last : first).focus();
        return;
      }

      if (!isShift && activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (isShift && (activeElement === first || !activeElement)) {
        event.preventDefault();
        last.focus();
      }
    }

    shadowRoot.addEventListener('keydown', handlePanelKeydown);
    return () => {
      shadowRoot.removeEventListener('keydown', handlePanelKeydown);
    };
  });

  // Body scroll lock for mobile fullscreen.
  // position:fixed on body prevents iOS Safari from scrolling the page behind the widget.
  // overflow:hidden alone is not enough — iOS Safari can bypass it for momentum scrolling.
  // We also set the html background to match the widget so the purple page never peeks through.
  $effect(() => {
    const isMobile = window.innerWidth <= 640;
    if (isOpen && isMobile) {
      const scrollY = window.scrollY;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      const prevHtmlBg = document.documentElement.style.background;
      const prevBodyOverflow = document.body.style.overflow;
      const prevBodyPosition = document.body.style.position;
      const prevBodyTop = document.body.style.top;
      const prevBodyLeft = document.body.style.left;
      const prevBodyRight = document.body.style.right;
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.background = '#1e1e1e';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      return () => {
        document.documentElement.style.overflow = prevHtmlOverflow;
        document.documentElement.style.background = prevHtmlBg;
        document.body.style.overflow = prevBodyOverflow;
        document.body.style.position = prevBodyPosition;
        document.body.style.top = prevBodyTop;
        document.body.style.left = prevBodyLeft;
        document.body.style.right = prevBodyRight;
        window.scrollTo(0, scrollY);
      };
    }
  });

  // Convert Recommendation to Product format for ChatMessage
  function convertToProducts(recommendations: Recommendation[]) {
    return recommendations.map((rec, index) => ({
      id: rec.id,
      image: rec.image_url || rec.image || '',
      title: rec.name || '',
      price: rec.price != null && !isNaN(rec.price) ? rec.price : 0,
      originalPrice: undefined,
      rating: undefined,
      discount: undefined,
      category: rec.wine_type,
      shopLink: rec.shop_link,
      brand: rec.brand,
      varietal: rec.varietal,
      region: rec.region,
      vintage: rec.vintage,
      body: rec.body,
      sweetness: rec.sweetness,
      description: rec.description,
      tasting_notes: rec.tasting_notes,
      flavor_profile: rec.flavor_profile,
      food_pairings: rec.food_pairings,
      rankPosition: rec.rankPosition ?? index + 1
    }));
  }

  function handleRecommendationProductAction(
    messageId: string | undefined,
    product: {
      id?: string;
      title?: string;
      category?: string;
      subcategory?: string;
      rankPosition?: number;
    }
  ) {
    if (!messageId) return;
    void sendAnalyticsEvent('external_link_clicked', {
      messageId,
      productId: product.id ?? null,
      rankPosition: product.rankPosition ?? null,
      payload: {
        product_name: product.title ?? null,
        category: product.category ?? null
      }
    });
  }

  function handleRecommendationExpanded(
    messageId: string | undefined,
    details: { isExpanded: boolean; totalProducts: number; visibleProducts: number }
  ) {
    if (!messageId || !details.isExpanded) return;
    void sendAnalyticsEvent('results_expanded', {
      messageId,
      payload: {
        total_products: details.totalProducts,
        visible_products: details.visibleProducts
      }
    });
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
    void sendAnalyticsEvent('session_closed', {
      payload: { reason: 'clear_chat' },
      useBeacon: true
    });
    messages = [];
    localStorage.removeItem(STORAGE_KEY);
    resetAnalyticsSession();
  }

  // ============================================
  // WINE GUIDED FLOW STEPS
  // ============================================

  // Step 1: Wine Style
  const wineStyleStep = {
    id: 'wine_type',
    title: 'What type of wine?',
    subtitle: '(Select one)',
    type: 'single-select' as const,
    required: true,
    options: [
      { id: 'red', label: 'Red', value: 'red', icon: wineRedIcon },
      { id: 'white', label: 'White', value: 'white', icon: wineWhiteIcon },
      { id: 'rose', label: 'Rosé', value: 'rose', icon: wineRoseIcon },
      { id: 'sparkling', label: 'Sparkling', value: 'sparkling', icon: wineSparklingIcon },
      { id: 'dessert', label: 'Dessert', value: 'dessert', icon: wineDessertIcon },
      { id: 'surprise', label: 'Surprise Me', value: null, icon: wineSurpriseIcon }
    ]
  };

  // Step 2: Occasion
  const occasionStep = {
    id: 'occasion',
    title: 'What\'s the occasion?',
    subtitle: '(Select one)',
    type: 'single-select' as const,
    required: true,
    options: [
      { id: 'dinner-party', label: 'Dinner Party', value: 'dinner-party' },
      { id: 'date-night', label: 'Date Night', value: 'date-night' },
      { id: 'gift', label: 'Gift', value: 'gift' },
      { id: 'casual', label: 'Casual', value: 'casual' },
      { id: 'celebration', label: 'Celebration', value: 'celebration' },
      { id: 'cooking', label: 'Cooking', value: 'cooking' },
      { id: 'surprise-occasion', label: 'Surprise Me', value: null, icon: wineSurpriseIcon }
    ]
  };

  // Step 3: Flavor Profile
  const flavorStep = {
    id: 'flavor_profile',
    title: 'What flavors appeal to you?',
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
      { id: 'berry-cherry', label: 'Berry & Cherry', value: 'berry', icon: flavorBerryIcon },
      { id: 'citrus-apple', label: 'Citrus & Apple', value: 'citrus', icon: flavorCitrusIcon },
      { id: 'tropical', label: 'Tropical', value: 'tropical', icon: flavorTropicalIcon },
      { id: 'chocolate-coffee', label: 'Chocolate', value: 'chocolate', icon: flavorChocolateIcon },
      { id: 'vanilla-caramel', label: 'Vanilla & Oak', value: 'vanilla', icon: flavorVanillaIcon },
      { id: 'pepper-spice', label: 'Pepper & Spice', value: 'pepper', icon: flavorPepperIcon },
      { id: 'floral-herbal', label: 'Floral & Herbal', value: 'floral', icon: flavorFloralIcon },
      { id: 'earthy-mineral', label: 'Earthy', value: 'earthy', icon: flavorEarthyIcon }
    ]
  };

  // Step 4: Body (slider)
  const bodyStep = {
    id: 'body',
    title: 'How heavy should the wine feel?',
    subtitle: '',
    type: 'slider' as const,
    required: true,
    options: [
      { id: 'light', label: 'Light', value: 'light', description: 'Crisp & delicate' },
      { id: 'medium', label: 'Medium', value: 'medium', description: 'Balanced & smooth' },
      { id: 'full', label: 'Full', value: 'full', description: 'Bold & rich' }
    ]
  };

  // Step 5: Price
  const priceStep = {
    id: 'price',
    title: 'Max Price',
    subtitle: '',
    type: 'price-selector' as const,
    required: true,
    options: []
  };

  // Single wine flow — no branching needed (unlike cannabis with edibles fork)
  const wineFlowSteps = [
    wineStyleStep,
    occasionStep,
    flavorStep,
    bodyStep,
    priceStep
  ];

  // Wine flow — single path, no branching
  const allGuidedFlowSteps = wineFlowSteps;

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

    const analyticsContext = createAnalyticsContext();
    
    // Add query as user message
    const queryMessage = createMessage("user", metadata.guidedFlowQuery, {
      analyticsMessageId: analyticsContext.message_id
    });
    messages = [...messages, queryMessage];
    loading = true;

    // Add shimmer loading message
    const shimmerIndex = messages.length;
    messages = [
      ...messages,
      createMessage("assistant", "Looking for best matches...", { shimmer: true, analyticsMessageId: analyticsContext.message_id })
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
            semantic_search: metadata.guidedFlowQuery || "",
            analytics: analyticsContext
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
          analyticsMessageId: analyticsContext.message_id
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
            content: "I couldn't find any products matching those exact specifications. Try adjusting your preferences, or feel free to ask me about specific products!",
            analyticsMessageId: analyticsContext.message_id
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

  function handleSelectionChange(_selections: Record<string, any>) {
    // No dynamic step branching needed for wine flow
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
  async function handleProductQuestion(
    productQuery: string,
    payload: { messages: Message[] },
    analyticsContext: AnalyticsContextPayload
  ) {
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
          messages: payload.messages,
          product_query: productQuery,
          retry_attempt: retryAttempts,
          analytics: analyticsContext
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
        await streamWithProductContext(lookupResult.product, payload, analyticsContext);

      } else if (lookupResult.needsClarification) {
        // Low/medium confidence - show clarification question
        console.log('[Product Lookup] Needs clarification, streaming clarification context');

        // Stream the clarification question - WAIT FOR COMPLETION
        await streamFollowUp(lookupResult.message, payload, analyticsContext);

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
  async function streamWithProductContext(
    product: Recommendation | Record<string, any> | null,
    payload: { messages: Message[] },
    analyticsContext: AnalyticsContextPayload
  ) {
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
          productContext: product ? JSON.stringify(product, null, 2) : null,
          analytics: analyticsContext
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
                messages = [...messages, createMessage("assistant", cleanContent, { analyticsMessageId: analyticsContext.message_id })];
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  createMessage("assistant", cleanContent, {
                    id: messages[streamingMessageIndex]?.id,
                    analyticsMessageId: analyticsContext.message_id
                  }),
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
          image: product.image_url || product.image || '',
          image_url: product.image_url || product.image || '',
          shop_link: product.shop_link || '',
          description: product.description || '',
          wine_type: product.wine_type || '',
          varietal: product.varietal || '',
          region: product.region || '',
          vintage: product.vintage,
          body: product.body || '',
          sweetness: product.sweetness || '',
          brand: product.brand || '',
          tasting_notes: product.tasting_notes || '',
          flavor_profile: product.flavor_profile,
          food_pairings: product.food_pairings,
          rankPosition: 1
        };

        // Insert product card immediately after the streaming message
        messages = [
          ...messages.slice(0, streamingMessageIndex + 1),
          createMessage("assistant", "", {
            recommendations: [productRecommendation],
            analyticsMessageId: analyticsContext.message_id
          }),
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
  async function streamFollowUp(
    clarificationMessage: string,
    payload: { messages: Message[] },
    analyticsContext: AnalyticsContextPayload
  ) {
    console.log('[Follow-up] Clarification message:', clarificationMessage);
    console.log('[Follow-up] Payload messages count:', payload.messages.length);
    console.log('[Follow-up] Sending clarificationContext:', clarificationMessage);

    let buffer = "";
    let botMessageContent = "";
    let streamingMessageIndex: number | null = null;  // Always append NEW message

    try {
      const requestBody = {
        ...payload,
        clarificationContext: clarificationMessage,
        analytics: analyticsContext
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
                messages = [...messages, createMessage("assistant", cleanContent, { analyticsMessageId: analyticsContext.message_id })];
                console.log('[Follow-up] Created new message at index:', streamingMessageIndex);
              } else {
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  createMessage("assistant", cleanContent, {
                    id: messages[streamingMessageIndex]?.id,
                    analyticsMessageId: analyticsContext.message_id
                  }),
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

    const analyticsContext = createAnalyticsContext();
    messages = [...messages, createMessage("user", userMsg, { analyticsMessageId: analyticsContext.message_id })];
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
        body: JSON.stringify({
          ...payload,
          analytics: analyticsContext
        }),
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
                messages = [...messages, createMessage("assistant", cleanContent, { analyticsMessageId: analyticsContext.message_id })];
              } else {
                // Update the existing streaming message
                messages = [
                  ...messages.slice(0, streamingMessageIndex),
                  createMessage("assistant", cleanContent, {
                    id: messages[streamingMessageIndex]?.id,
                    analyticsMessageId: analyticsContext.message_id
                  }),
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
        createMessage("assistant", "Looking for best matches...", { shimmer: true, analyticsMessageId: analyticsContext.message_id }),
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
        const analyticsPayload = {
          ...intentPayload,
          analytics: analyticsContext
        };

        const intentResp = await fetch(`${CHAT_BASE_URL}/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analyticsPayload),
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
            semantic_search: semanticSearch,
            analytics: analyticsContext
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
            analyticsMessageId: analyticsContext.message_id
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
              content: "I couldn't find any products matching those exact specifications. Try adjusting your preferences, or feel free to ask me about specific products!",
              analyticsMessageId: analyticsContext.message_id
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
          await handleProductQuestion(productName, { messages }, analyticsContext);
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
  onToggle={toggleWidget}
  onClose={() => closeWidget('widget_closed')}
  onSend={handleSend}
  {position}
  expandIcon="dots"
  headerStyle="minimal"
  menuItems={menuItems}
  menuPosition="left"
  menuMode="sidebar"
  onMenuItemClick={handleMenuItemClick}
  title="Wine Sommelier"
  themeBackgroundColor="#F4C37D"
  iconSrc={chatIcon}
  launcherIconSrc={launcherIcon}
  launcherAriaLabel={launcherLabel}
  launcherButtonBackgroundColor={launcherBg}
  hideLauncher={hideLauncher}
  {offsetX}
  {offsetY}
  zIndex={zIndex}
  windowWidth={width}
  windowHeight={height}
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
  showScrollButton={activePanel === null}
  panelOpen={activePanel !== null}
  ariaMessageLogLabel="Wine sommelier chat messages"
  announceStreamingMode="final-only"
  announcementText={a11yAnnouncement}
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
            recommendationTitle={msg.role === 'assistant' && msg.recommendations && msg.recommendations.length > 0 ? "Sommelier recommendations" : undefined}
            recommendationLayout="compact-list"
            productsInBubble={true}
            showHoverActions={false}
            actionType="link"
            onProductAction={(product) => handleRecommendationProductAction(msg.analyticsMessageId, product)}
            onResultsExpanded={(details) => handleRecommendationExpanded(msg.analyticsMessageId, details)}
          />
        {/if}
      {/each}
    {:else}
      <div
        class="widget-panel"
        class:widget-panel--feedback={activePanel === 'feedback'}
        class:widget-panel--scrollable={false}
        role="dialog"
        aria-modal="true"
        aria-labelledby={activePanel ? `widget-panel-title-${activePanel}` : undefined}
        tabindex="-1"
        bind:this={panelRef}
      >
        <div class="widget-panel__top">
          <button type="button" class="widget-panel__back" onclick={closePanel} aria-label="Back to chat" bind:this={panelBackButtonRef}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 14L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>

        {#if activePanel === 'ai-disclosure'}
          <div class="widget-panel__title-row">
            <h3 id="widget-panel-title-ai-disclosure">AI Assistant Disclosure</h3>
            <button type="button" class="widget-panel__external-link" onclick={() => openExternalPanelPage(activePanel)}>Full Page</button>
          </div>
          <p>This assistant is experimental. Responses are generated automatically and may be incomplete, inaccurate, or outdated.</p>
          <ul>
            <li>Use guidance as informational, not guaranteed advice.</li>
            <li>Verify key product details with in-store staff before purchase.</li>
            <li>This assistant does not provide medical diagnosis or treatment advice.</li>
          </ul>
          <p class="widget-panel__note">For urgent health concerns, contact a licensed medical professional or call 911.</p>
        {:else if activePanel === 'medical-disclosure'}
          <div class="widget-panel__title-row">
            <h3 id="widget-panel-title-medical-disclosure">Medical and Recreational Disclosure</h3>
            <button type="button" class="widget-panel__external-link" onclick={() => openExternalPanelPage(activePanel)}>Full Page</button>
          </div>
          <p>This is a wine recommendation assistant. Content is for retail and educational purposes only.</p>
          <ul>
            <li>Please drink responsibly. You must be of legal drinking age.</li>
            <li>Wine recommendations are based on product metadata and may not reflect personal taste.</li>
            <li>Do not drive or operate machinery while impaired.</li>
          </ul>
        {:else if activePanel === 'feedback'}
          <div class="widget-panel__title-row">
            <h3 id="widget-panel-title-feedback">Send Feedback</h3>
            <button type="button" class="widget-panel__external-link" onclick={() => openExternalPanelPage(activePanel)}>Full Page</button>
          </div>
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
            <p
              class="widget-panel__note"
              class:widget-panel__note--error={feedbackNoticeType === 'error'}
              role={feedbackNoticeType === 'error' ? 'alert' : 'status'}
              aria-live={feedbackNoticeType === 'error' ? 'assertive' : 'polite'}
              aria-atomic="true"
            >
              {feedbackNotice}
            </p>
          {/if}
        {/if}
      </div>
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
    min-height: auto;
    height: auto;
    flex: 0 0 auto;
    padding: 14px 12px 20px;
    color: #ebebeb;
    display: block;
    overflow: visible;
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
    justify-content: flex-start;
    gap: 6px;
    margin-top: 6px;
    margin-bottom: 8px;
    padding-right: 0;
  }

  .widget-panel__title-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 2px;
  }

  .widget-panel__title-row h3 {
    margin: 0;
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

  .widget-panel__back:focus-visible,
  .widget-panel__external-link:focus-visible,
  .feedback-form__submit:focus-visible,
  .feedback-screenshot__remove:focus-visible,
  .feedback-form input:focus-visible,
  .feedback-form select:focus-visible,
  .feedback-form textarea:focus-visible {
    outline: 2px solid #71d0c2;
    outline-offset: 2px;
  }

  .widget-panel__external-link {
    border: none;
    background: transparent;
    color: #71d0c2;
    font-size: 0.8rem;
    line-height: 1;
    padding: 4px 2px;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
    white-space: nowrap;
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
    padding-bottom: 24px;
  }

  .widget-panel--scrollable {
    padding-bottom: 28px;
  }

  /* Mobile: move shimmer closer to left edge to match assistant messages */
  @media (max-width: 640px) {
    .shimmer-message {
      padding-left: 4px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .widget-panel,
    .widget-panel * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
</style>
