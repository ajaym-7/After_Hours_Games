declare module '*.jsx' {
  import type { ButtonHTMLAttributes, ComponentType, ReactNode } from 'react';
  export interface StepProps {
    children?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
  }
  export interface StepperProps {
    children?: ReactNode;
    step?: number;
    initialStep?: number;
    onStepChange?: (step: number) => void;
    onFinalStepCompleted?: () => void;
    indicator?: 'numbers' | 'dots' | 'bars';
    orientation?: 'horizontal' | 'vertical';
    transition?: 'slide' | 'fade' | 'none';
    linear?: boolean;
    disableStepIndicators?: boolean;
    showFooter?: boolean;
    backButtonText?: string;
    nextButtonText?: string;
    completeButtonText?: string;
    backButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
    nextButtonProps?: ButtonHTMLAttributes<HTMLButtonElement>;
    theme?: 'dark' | 'light';
    accentColor?: string;
    frame?: boolean;
    radius?: number;
    width?: number | string;
    className?: string;
  }
  export const Step: ComponentType<StepProps>;
  const Stepper: ComponentType<StepperProps>;
  export default Stepper;
}
