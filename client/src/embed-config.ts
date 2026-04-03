export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface EmbedConfig {
  apiBase: string;
  store: string;
  position: WidgetPosition;
  offsetX: string;
  offsetY: string;
  zIndex: number;
  width: string;
  height: string;
  launcherIcon?: string;
  launcherLabel: string;
  launcherBg?: string;
  hideLauncher: boolean;
}

const VALID_POSITIONS = new Set<WidgetPosition>([
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
]);

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);
const CSS_LENGTH_PATTERN = /^-?\d+(\.\d+)?$/;

export const DEFAULT_WIDGET_POSITION: WidgetPosition = 'bottom-right';
export const DEFAULT_WIDGET_OFFSET = '20px';
export const DEFAULT_WIDGET_WIDTH = '426px';
export const DEFAULT_WIDGET_HEIGHT = '702px';
export const DEFAULT_WIDGET_Z_INDEX = 2147483000;
export const DEFAULT_LAUNCHER_LABEL = 'Open chat widget';

function normalizeOptionalString(value: string | undefined | null): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeCssLength(value: string | undefined | null, fallback: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return fallback;
  if (CSS_LENGTH_PATTERN.test(normalized)) {
    return `${normalized}px`;
  }
  return normalized;
}

function normalizePosition(value: string | undefined | null): WidgetPosition {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized && VALID_POSITIONS.has(normalized as WidgetPosition)) {
    return normalized as WidgetPosition;
  }
  return DEFAULT_WIDGET_POSITION;
}

function normalizeZIndex(value: string | undefined | null): number {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return DEFAULT_WIDGET_Z_INDEX;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_WIDGET_Z_INDEX;
  return parsed;
}

function normalizeBoolean(value: string | undefined | null): boolean {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  return normalized ? TRUTHY_VALUES.has(normalized) : false;
}

export function resolveWidgetScript(): HTMLScriptElement | null {
  if (typeof document === 'undefined') return null;

  if (document.currentScript instanceof HTMLScriptElement) {
    return document.currentScript;
  }

  const widgetScripts = Array.from(
    document.querySelectorAll<HTMLScriptElement>('script[src*="widget.js"]')
  );
  const lastWidgetScript = widgetScripts[widgetScripts.length - 1];
  if (lastWidgetScript instanceof HTMLScriptElement) {
    return lastWidgetScript;
  }

  const scriptById = document.getElementById('ecom-widget-script');
  if (scriptById instanceof HTMLScriptElement) {
    return scriptById;
  }

  return null;
}

export function parseEmbedConfig({
  script,
  defaultApiBase,
  defaultStore,
}: {
  script: HTMLScriptElement | null;
  defaultApiBase: string;
  defaultStore: string;
}): EmbedConfig {
  return {
    apiBase: normalizeOptionalString(script?.dataset.api) ?? defaultApiBase,
    store: normalizeOptionalString(script?.dataset.store) ?? defaultStore,
    position: normalizePosition(script?.dataset.position),
    offsetX: normalizeCssLength(script?.dataset.offsetX, DEFAULT_WIDGET_OFFSET),
    offsetY: normalizeCssLength(script?.dataset.offsetY, DEFAULT_WIDGET_OFFSET),
    zIndex: normalizeZIndex(script?.dataset.zIndex),
    width: normalizeCssLength(script?.dataset.width, DEFAULT_WIDGET_WIDTH),
    height: normalizeCssLength(script?.dataset.height, DEFAULT_WIDGET_HEIGHT),
    launcherIcon: normalizeOptionalString(script?.dataset.launcherIcon),
    launcherLabel: normalizeOptionalString(script?.dataset.launcherLabel) ?? DEFAULT_LAUNCHER_LABEL,
    launcherBg: normalizeOptionalString(script?.dataset.launcherBg),
    hideLauncher: normalizeBoolean(script?.dataset.hideLauncher),
  };
}
