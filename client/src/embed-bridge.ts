export const WIDGET_ROOT_ID = 'AiChatBot-Widget-Root';
export const WIDGET_API_NAME = 'EcomWidget';

export const WIDGET_COMMAND_EVENT = 'ecom-widget:command';

export const WIDGET_READY_EVENT = 'ecom-widget:ready';
export const WIDGET_OPEN_EVENT = 'ecom-widget:open';
export const WIDGET_CLOSE_EVENT = 'ecom-widget:close';
export const WIDGET_DESTROY_EVENT = 'ecom-widget:destroy';

export type WidgetCommand = 'open' | 'close' | 'toggle';

export function dispatchWidgetCommand(command: WidgetCommand): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(WIDGET_COMMAND_EVENT, {
      detail: { command },
    })
  );
}

export function subscribeToWidgetCommands(handler: (command: WidgetCommand) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    if (!(event instanceof CustomEvent)) return;
    const command = event.detail?.command;
    if (command === 'open' || command === 'close' || command === 'toggle') {
      handler(command);
    }
  };

  window.addEventListener(WIDGET_COMMAND_EVENT, listener as EventListener);
  return () => {
    window.removeEventListener(WIDGET_COMMAND_EVENT, listener as EventListener);
  };
}

export function dispatchWidgetLifecycleEvent<T>(eventName: string, detail: T): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(eventName, {
      detail,
    })
  );
}
