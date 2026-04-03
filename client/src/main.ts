import { mount, unmount } from 'svelte';
import Widget from './Widget.svelte';
import {
  parseEmbedConfig,
  resolveWidgetScript,
  type EmbedConfig,
} from './embed-config';
import {
  WIDGET_API_NAME,
  WIDGET_DESTROY_EVENT,
  WIDGET_READY_EVENT,
  WIDGET_ROOT_ID,
  dispatchWidgetCommand,
  dispatchWidgetLifecycleEvent,
} from './embed-bridge';

interface WidgetHostApi {
  open: () => void;
  close: () => void;
  toggle: () => void;
  destroy: () => void;
  isOpen: () => boolean;
}

interface WidgetSingleton {
  instanceId: string;
  app: ReturnType<typeof mount>;
  container: HTMLDivElement;
  shadowRoot: ShadowRoot;
  api: WidgetHostApi;
  config: EmbedConfig;
  isOpen: boolean;
  destroy: () => void;
}

declare global {
  interface Window {
    EcomWidget?: WidgetHostApi;
    __ECOM_WIDGET_SINGLETON__?: WidgetSingleton;
    __ECOM_WIDGET_SCRIPT_OBSERVER__?: MutationObserver;
  }
}

const DEFAULT_API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8787/chat';
const DEFAULT_STORE =
  import.meta.env.VITE_STORE_NAME ?? window.location.hostname ?? 'demo-store';

function injectGoogleFonts(shadowRoot: ShadowRoot): void {
  const existing = shadowRoot.querySelector(
    'link[data-ecom-widget-fonts="true"]'
  ) as HTMLLinkElement | null;
  if (existing) return;

  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  fontLink.setAttribute('data-ecom-widget-fonts', 'true');
  shadowRoot.appendChild(fontLink);
}

function getActiveSingleton(): WidgetSingleton | undefined {
  const singleton = window.__ECOM_WIDGET_SINGLETON__;
  if (!singleton) return undefined;
  if (!singleton.container.isConnected) return undefined;
  return singleton;
}

function findWidgetScript(node: Node): HTMLScriptElement | null {
  if (node instanceof HTMLScriptElement && node.src.includes('widget.js')) {
    return node;
  }

  if (node instanceof Element) {
    return node.querySelector<HTMLScriptElement>('script[src*="widget.js"]');
  }

  return null;
}

function createInertApi(instanceId: string): WidgetHostApi {
  const isActive = () => window.__ECOM_WIDGET_SINGLETON__?.instanceId === instanceId;

  return {
    open: () => {
      if (isActive()) dispatchWidgetCommand('open');
    },
    close: () => {
      if (isActive()) dispatchWidgetCommand('close');
    },
    toggle: () => {
      if (isActive()) dispatchWidgetCommand('toggle');
    },
    destroy: () => {
      if (isActive()) {
        window.__ECOM_WIDGET_SINGLETON__?.destroy();
      }
    },
    isOpen: () => {
      if (!isActive()) return false;
      return window.__ECOM_WIDGET_SINGLETON__?.isOpen ?? false;
    },
  };
}

function clearGlobalState(): void {
  delete window.__ECOM_WIDGET_SINGLETON__;
  delete window[WIDGET_API_NAME];
}

function removeStaleRoot(): void {
  const staleRoot = document.getElementById(WIDGET_ROOT_ID);
  staleRoot?.remove();
}

function mountWidget(): WidgetHostApi {
  const existing = getActiveSingleton();
  if (existing) {
    window[WIDGET_API_NAME] = existing.api;
    return existing.api;
  }

  removeStaleRoot();

  const script = resolveWidgetScript();
  const config = parseEmbedConfig({
    script,
    defaultApiBase: DEFAULT_API_BASE,
    defaultStore: DEFAULT_STORE,
  });

  const container = document.createElement('div');
  container.id = WIDGET_ROOT_ID;
  document.body.appendChild(container);

  const shadowRoot = container.attachShadow({ mode: 'open' });
  injectGoogleFonts(shadowRoot);

  const instanceId = crypto.randomUUID();
  const api = createInertApi(instanceId);
  let singleton: WidgetSingleton | undefined;

  const destroy = () => {
    const active = window.__ECOM_WIDGET_SINGLETON__;
    if (!active || active.instanceId !== instanceId) return;

    unmount(active.app);
    active.container.remove();
    clearGlobalState();
    dispatchWidgetLifecycleEvent(WIDGET_DESTROY_EVENT, { destroyed: true });
  };

  const app = mount(Widget, {
    target: shadowRoot,
    props: {
      store: config.store,
      apiBase: config.apiBase,
      position: config.position,
      offsetX: config.offsetX,
      offsetY: config.offsetY,
      zIndex: config.zIndex,
      width: config.width,
      height: config.height,
      launcherIcon: config.launcherIcon,
      launcherLabel: config.launcherLabel,
      launcherBg: config.launcherBg,
      hideLauncher: config.hideLauncher,
      onOpenStateChange: (isOpen: boolean) => {
        const active = window.__ECOM_WIDGET_SINGLETON__;
        if (active?.instanceId === instanceId) {
          active.isOpen = isOpen;
        }
      },
    },
  });

  singleton = {
    instanceId,
    app,
    container,
    shadowRoot,
    api,
    config,
    isOpen: false,
    destroy,
  };

  window.__ECOM_WIDGET_SINGLETON__ = singleton;
  window[WIDGET_API_NAME] = api;

  dispatchWidgetLifecycleEvent(WIDGET_READY_EVENT, {
    store: config.store,
    apiBase: config.apiBase,
  });

  return api;
}

function ensureScriptObserver(): void {
  if (typeof document === 'undefined') return;
  if (window.__ECOM_WIDGET_SCRIPT_OBSERVER__) return;

  const observer = new MutationObserver((records) => {
    if (getActiveSingleton()) return;

    for (const record of records) {
      for (const node of Array.from(record.addedNodes)) {
        const widgetScript = findWidgetScript(node);
        if (!widgetScript) continue;

        queueMicrotask(() => {
          if (!getActiveSingleton()) {
            bootstrap();
          }
        });
        return;
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.__ECOM_WIDGET_SCRIPT_OBSERVER__ = observer;
}

function bootstrap(): WidgetHostApi {
  if (!document.body) {
    throw new Error('Widget bootstrap requires document.body');
  }
  return mountWidget();
}

let widgetApi: WidgetHostApi | undefined;

function startBootstrap(): WidgetHostApi | undefined {
  if (typeof document === 'undefined') return undefined;

  ensureScriptObserver();

  if (document.body) {
    widgetApi = bootstrap();
    return widgetApi;
  }

  const handleReady = () => {
    document.removeEventListener('DOMContentLoaded', handleReady);
    widgetApi = bootstrap();
  };

  document.addEventListener('DOMContentLoaded', handleReady, { once: true });
  return widgetApi;
}

export default startBootstrap();
