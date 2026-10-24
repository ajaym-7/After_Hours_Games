declare module '*.jsx' {
  import type { ButtonHTMLAttributes, ComponentType, CSSProperties, ReactNode } from 'react';
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
    items?: InfiniteMenuItem[];
    count?: number;
    tileSize?: number;
    roundness?: number;
    zoom?: number;
    pullBack?: number;
    stretch?: number;
    inertia?: number;
    autoplay?: number;
    grayscale?: boolean;
    dim?: number;
    intro?: boolean;
    showInfo?: boolean;
    renderInfo?: (item: InfiniteMenuItem, index: number, moving: boolean) => ReactNode;
    backgroundColor?: string;
    onActiveChange?: (item: InfiniteMenuItem, index: number) => void;
    onItemClick?: (item: InfiniteMenuItem, index: number) => void;
    onUserInteract?: () => void;
    style?: CSSProperties;
  }
  export interface InfiniteMenuItem {
    id: string;
    image: string;
    link?: string;
    title: string;
    description: string;
  }
  export const Step: ComponentType<StepProps>;
  const Stepper: ComponentType<StepperProps>;
  export default Stepper;
}
