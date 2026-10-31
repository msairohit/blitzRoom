import { Platform } from 'react-native';

/**
 * Spacing & layout tokens for BlitzRoom
 * Base unit: 4px
 */

/** 4px base spacing scale */
export const spacing = {
  /** 2px */
  xxs: 2,
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  xxl: 24,
  /** 32px */
  xxxl: 32,
  /** 40px */
  huge: 40,
  /** 48px */
  massive: 48,
  /** 64px */
  giant: 64,
} as const;

/** Border radius tokens */
export const radius = {
  /** 4px — subtle rounding */
  xs: 4,
  /** 8px — small elements */
  sm: 8,
  /** 12px — cards, inputs */
  md: 12,
  /** 16px — larger cards */
  lg: 16,
  /** 20px — prominent cards */
  xl: 20,
  /** 24px — modal sheets */
  xxl: 24,
  /** 9999px — pills, avatars */
  full: 9999,
} as const;

/** Elevation/shadow presets */
export const shadows = {
  sm: Platform.select({
    web: {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
  }) as any,
  md: Platform.select({
    web: {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
  }) as any,
  lg: Platform.select({
    web: {
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.25)',
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
  }) as any,
  glow: (color: string) =>
    Platform.select({
      web: {
        boxShadow: `0 0 20px ${color}`,
      },
      default: {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 10,
      },
    }) as any,
};

/** Animation timing constants */
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  springBouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
} as const;

/** Hit slop for touch targets */
export const hitSlop = {
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  medium: { top: 12, bottom: 12, left: 12, right: 12 },
  large: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;
