/**
 * BlitzRoom Color Themes
 * 5 curated color palettes with dark-mode-first design.
 * Each theme has deep backgrounds and vibrant accent colors.
 */

export type ThemeId = 'blue' | 'green' | 'orange' | 'red' | 'purple';

export interface ThemeColors {
  /** Theme identifier */
  id: ThemeId;
  /** Display name */
  name: string;
  /** Emoji for theme picker */
  emoji: string;

  // Backgrounds
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  surface: string;
  surfaceElevated: string;

  // Primary accent
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryMuted: string;

  // Secondary accent
  secondary: string;
  secondaryLight: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textOnPrimary: string;
  textOnSurface: string;

  // Borders
  border: string;
  borderLight: string;

  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;

  // Gradient pairs for premium UI elements
  gradientStart: string;
  gradientEnd: string;
  gradientGlow: string;

  // Overlay
  overlay: string;
  overlayLight: string;
}

const baseColors = {
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textTertiary: '#636E7F',
  textOnPrimary: '#FFFFFF',
  textOnSurface: '#E2E8F0',

  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

export const themes: Record<ThemeId, ThemeColors> = {
  blue: {
    id: 'blue',
    name: 'Ocean Blue',
    emoji: '🌊',
    ...baseColors,

    background: '#0B1120',
    backgroundSecondary: '#111827',
    backgroundTertiary: '#1E293B',
    surface: 'rgba(30, 41, 59, 0.7)',
    surfaceElevated: 'rgba(51, 65, 85, 0.5)',

    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    primaryMuted: 'rgba(59, 130, 246, 0.15)',

    secondary: '#06B6D4',
    secondaryLight: '#22D3EE',

    border: 'rgba(59, 130, 246, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',

    gradientStart: '#3B82F6',
    gradientEnd: '#06B6D4',
    gradientGlow: 'rgba(59, 130, 246, 0.3)',
  },

  green: {
    id: 'green',
    name: 'Emerald',
    emoji: '🌿',
    ...baseColors,

    background: '#0A1610',
    backgroundSecondary: '#0F1F17',
    backgroundTertiary: '#1A3328',
    surface: 'rgba(26, 51, 40, 0.7)',
    surfaceElevated: 'rgba(34, 69, 53, 0.5)',

    primary: '#10B981',
    primaryLight: '#34D399',
    primaryDark: '#059669',
    primaryMuted: 'rgba(16, 185, 129, 0.15)',

    secondary: '#14B8A6',
    secondaryLight: '#2DD4BF',

    border: 'rgba(16, 185, 129, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',

    gradientStart: '#10B981',
    gradientEnd: '#14B8A6',
    gradientGlow: 'rgba(16, 185, 129, 0.3)',
  },

  orange: {
    id: 'orange',
    name: 'Sunset',
    emoji: '🌅',
    ...baseColors,

    background: '#18100A',
    backgroundSecondary: '#231710',
    backgroundTertiary: '#3D2516',
    surface: 'rgba(61, 37, 22, 0.7)',
    surfaceElevated: 'rgba(87, 53, 28, 0.5)',

    primary: '#F59E0B',
    primaryLight: '#FBBF24',
    primaryDark: '#D97706',
    primaryMuted: 'rgba(245, 158, 11, 0.15)',

    secondary: '#F97316',
    secondaryLight: '#FB923C',

    border: 'rgba(245, 158, 11, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',

    gradientStart: '#F59E0B',
    gradientEnd: '#F97316',
    gradientGlow: 'rgba(245, 158, 11, 0.3)',
  },

  red: {
    id: 'red',
    name: 'Crimson',
    emoji: '🔥',
    ...baseColors,

    background: '#180A0A',
    backgroundSecondary: '#231010',
    backgroundTertiary: '#3D1616',
    surface: 'rgba(61, 22, 22, 0.7)',
    surfaceElevated: 'rgba(87, 28, 28, 0.5)',

    primary: '#EF4444',
    primaryLight: '#F87171',
    primaryDark: '#DC2626',
    primaryMuted: 'rgba(239, 68, 68, 0.15)',

    secondary: '#F43F5E',
    secondaryLight: '#FB7185',

    border: 'rgba(239, 68, 68, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',

    gradientStart: '#EF4444',
    gradientEnd: '#F43F5E',
    gradientGlow: 'rgba(239, 68, 68, 0.3)',
  },

  purple: {
    id: 'purple',
    name: 'Cosmic',
    emoji: '🔮',
    ...baseColors,

    background: '#0F0A1A',
    backgroundSecondary: '#161023',
    backgroundTertiary: '#251A3D',
    surface: 'rgba(37, 26, 61, 0.7)',
    surfaceElevated: 'rgba(53, 37, 87, 0.5)',

    primary: '#8B5CF6',
    primaryLight: '#A78BFA',
    primaryDark: '#7C3AED',
    primaryMuted: 'rgba(139, 92, 246, 0.15)',

    secondary: '#D946EF',
    secondaryLight: '#E879F9',

    border: 'rgba(139, 92, 246, 0.2)',
    borderLight: 'rgba(148, 163, 184, 0.1)',

    gradientStart: '#8B5CF6',
    gradientEnd: '#D946EF',
    gradientGlow: 'rgba(139, 92, 246, 0.3)',
  },
};

export const DEFAULT_THEME: ThemeId = 'blue';
