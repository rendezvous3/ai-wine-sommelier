export interface FlowOption {
  id: string;
  label: string;
  icon?: string; // SVG string or icon name
  value: any;
  description?: string;
}

export interface FlowStep {
  id: string;
  title: string;
  subtitle?: string; // e.g., "(Select one)" or "(Up to 2)"
  type: 'single-select' | 'multi-select';
  maxSelections?: number; // for multi-select
  options: FlowOption[];
  required?: boolean;
}

export interface GuidedFlowConfig {
  steps: FlowStep[];
  onComplete?: (selections: Record<string, any>) => void;
  onClose?: () => void;
  onStepChange?: (stepIndex: number, stepId: string) => void;
}

export interface FlowState {
  currentStepIndex: number;
  selections: Record<string, any>;
  completedSteps: Set<number>;
}

