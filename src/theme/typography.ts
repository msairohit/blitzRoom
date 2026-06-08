/**
 * Typography scale for BlitzRoom
 * Using system fonts with carefully crafted size/weight scales.
 */

import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  web: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: undefined, // Uses system font on native
});

type FontWeight = TextStyle['fontWeight'];

const weights: Record<string, FontWeight> = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const typography = {
  // Display — hero sections, big numbers
  displayLarge: {
    fontFamily,
    fontSize: 40,
    lineHeight: 48,
    fontWeight: weights.extrabold,
    letterSpacing: -1.5,
  } as TextStyle,

  displayMedium: {
    fontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: weights.bold,
    letterSpacing: -1,
  } as TextStyle,

  // Headlines
  headlineLarge: {
    fontFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: weights.bold,
    letterSpacing: -0.5,
  } as TextStyle,

  headlineMedium: {
    fontFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: weights.semibold,
    letterSpacing: -0.3,
  } as TextStyle,

  headlineSmall: {
    fontFamily,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: weights.semibold,
    letterSpacing: 0,
  } as TextStyle,

  // Titles
  titleLarge: {
    fontFamily,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: weights.semibold,
    letterSpacing: 0,
  } as TextStyle,

  titleMedium: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: weights.medium,
    letterSpacing: 0.1,
  } as TextStyle,

  titleSmall: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: weights.medium,
    letterSpacing: 0.1,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: weights.regular,
    letterSpacing: 0.2,
  } as TextStyle,

  bodyMedium: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: weights.regular,
    letterSpacing: 0.15,
  } as TextStyle,

  bodySmall: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: weights.regular,
    letterSpacing: 0.2,
  } as TextStyle,

  // Labels
  labelLarge: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: weights.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  labelMedium: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: weights.semibold,
    letterSpacing: 0.5,
  } as TextStyle,

  labelSmall: {
    fontFamily,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  } as TextStyle,

  // Special — room codes, big score numbers
  mono: {
    fontFamily: Platform.select({
      web: '"JetBrains Mono", "Fira Code", monospace',
      default: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }),
    fontSize: 32,
    lineHeight: 40,
    fontWeight: weights.bold,
    letterSpacing: 4,
  } as TextStyle,
};
