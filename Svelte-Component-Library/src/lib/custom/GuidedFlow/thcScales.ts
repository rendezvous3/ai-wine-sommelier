// Legacy file — THC scales no longer used in wine POC.
// Kept for backwards compatibility with GuidedFlow infrastructure.
// Wine body scale is defined inline in Widget.svelte guided flow steps.

export interface THCScaleOption {
  id: string;
  label: string;
  value: string;
  description: string;
  min: number | null;
  max: number | null;
}

// No-op exports for any code that still imports these
export const FLOWER_PREROLLS_SCALE: THCScaleOption[] = [];
export const VAPORIZERS_CONCENTRATES_SCALE: THCScaleOption[] = [];

export function getTHCScaleForCategory(_category: string | null): THCScaleOption[] {
  return [];
}

export function potencyToTHCRange(_potency: string, _category: string | null): { min: number | null, max: number | null } {
  return { min: null, max: null };
}
