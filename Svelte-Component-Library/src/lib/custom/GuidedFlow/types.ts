export interface FlowOption {
  id: string;
  label: string;
  icon?: string; // SVG string or icon name
  value: any;
  description?: string;
  conflictsWith?: string[]; // Array of option values that conflict with this option
}

export interface FlowStep {
  id: string;
  title: string;
  subtitle?: string; // e.g., "(Select one)" or "(Up to 2)"
  type: 'single-select' | 'multi-select' | 'slider' | 'price-selector';
  maxSelections?: number; // for multi-select
  options: FlowOption[];
  required?: boolean;
  gridColumns?: number; // Number of columns for grid layout (default: auto-fit)
  cardSize?: 'normal' | 'small'; // Card size for compact grid layouts
  category?: string; // For price-selector: current selected category
  customStyles?: {
    padding?: string;
    fontSize?: string;
    iconSize?: string;
    minHeight?: string;
    [key: string]: string | undefined; // Allow any CSS property
  };
}

import type { TransformedMetadata } from './utils.js';

export interface GuidedFlowConfig {
  steps: FlowStep[];
  onComplete?: (selections: Record<string, any>, metadata?: TransformedMetadata) => void;
  onClose?: () => void;
  onStepChange?: (stepIndex: number, stepId: string) => void;
  onSelectionChange?: (selections: Record<string, any>) => void;
}

export interface FlowState {
  currentStepIndex: number;
  selections: Record<string, any>;
  completedSteps: Set<number>;
}

