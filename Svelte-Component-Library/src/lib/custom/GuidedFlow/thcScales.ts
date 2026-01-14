export interface THCScaleOption {
  id: string;
  label: string;
  value: string;
  description: string;
  min: number | null; // null means no minimum
  max: number | null; // null means no maximum
}

export const FLOWER_PREROLLS_SCALE: THCScaleOption[] = [
  { id: 'mild', label: 'Mild', value: 'mild', description: '<13%', min: null, max: 13 },
  { id: 'balanced', label: 'Balanced', value: 'balanced', description: '13-18%', min: 13, max: 18 },
  { id: 'moderate', label: 'Moderate', value: 'moderate', description: '18-22%', min: 18, max: 22 },
  { id: 'strong', label: 'Strong', value: 'strong', description: '22-28%', min: 22, max: 28 },
  { id: 'very-strong', label: 'Very Strong', value: 'very-strong', description: '>28%', min: 28, max: null }
];

export const VAPORIZERS_CONCENTRATES_SCALE: THCScaleOption[] = [
  { id: 'mild', label: 'Mild', value: 'mild', description: '<66%', min: null, max: 66 },
  { id: 'balanced', label: 'Balanced', value: 'balanced', description: '66-75%', min: 66, max: 75 },
  { id: 'moderate', label: 'Moderate', value: 'moderate', description: '75-85%', min: 75, max: 85 },
  { id: 'strong', label: 'Strong', value: 'strong', description: '85-90%', min: 85, max: 90 },
  { id: 'very-strong', label: 'Very Strong', value: 'very-strong', description: '>90%', min: 90, max: null }
];

export function getTHCScaleForCategory(category: string | null): THCScaleOption[] {
  if (category === 'vaporizers' || category === 'concentrates') {
    return VAPORIZERS_CONCENTRATES_SCALE;
  }
  // Default to flower/prerolls scale
  return FLOWER_PREROLLS_SCALE;
}

export function potencyToTHCRange(potency: string, category: string | null): { min: number | null, max: number | null } {
  const scale = getTHCScaleForCategory(category);
  const option = scale.find(opt => opt.value === potency);
  if (!option) return { min: null, max: null };
  return { min: option.min, max: option.max };
}

