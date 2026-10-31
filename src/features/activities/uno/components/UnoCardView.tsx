/**
 * UnoCardView — High-fidelity, crystal-clear visual Uno card component.
 * Features authentic oval emblems, dual-corner indices, vibrant color themes,
 * glowing playable states, and realistic face-down backs.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { UnoActiveColor, UnoCard, UnoColor } from '../types';

export const UNO_COLOR_PALETTES: Record<
  UnoColor,
  {
    bg: string;
    bgDark: string;
    text: string;
    border: string;
    accent: string;
  }
> = {
  red: {
    bg: '#EF4444',
    bgDark: '#B91C1C',
    text: '#EF4444',
    border: '#FECACA',
    accent: '#DC2626',
  },
  blue: {
    bg: '#2563EB',
    bgDark: '#1D4ED8',
    text: '#2563EB',
    border: '#BFDBFE',
    accent: '#1E40AF',
  },
  green: {
    bg: '#10B981',
    bgDark: '#047857',
    text: '#10B981',
    border: '#A7F3D0',
    accent: '#059669',
  },
  yellow: {
    bg: '#F59E0B',
    bgDark: '#D97706',
    text: '#D97706',
    border: '#FDE68A',
    accent: '#B45309',
  },
  wild: {
    bg: '#1E1B4B',
    bgDark: '#0F172A',
    text: '#FFFFFF',
    border: '#CBD5E1',
    accent: '#6366F1',
  },
};

export type UnoCardSize = 'mini' | 'hand' | 'table' | 'picker';

interface UnoCardViewProps {
  card?: UnoCard;
  faceDown?: boolean;
  size?: UnoCardSize;
  isPlayable?: boolean;
  isDimmed?: boolean;
  selected?: boolean;
  onPress?: () => void;
  style?: object;
  testID?: string;
}

export function UnoCardView({
  card,
  faceDown = false,
  size = 'hand',
  isPlayable = false,
  isDimmed = false,
  selected = false,
  onPress,
  style,
  testID,
}: UnoCardViewProps) {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  // Dimensions based on size
  const getDims = () => {
    switch (size) {
      case 'mini':
        return { w: 32, h: 48, r: 5, border: 1.5, numSize: 10, cornerSize: 8 };
      case 'table':
        return { w: 105, h: 154, r: 14, border: 3.5, numSize: 42, cornerSize: 14 };
      case 'picker':
        return { w: 72, h: 108, r: 10, border: 2.5, numSize: 26, cornerSize: 11 };
      case 'hand':
      default:
        return { w: 76, h: 114, r: 12, border: 3, numSize: 30, cornerSize: 12 };
    }
  };

  const dims = getDims();

  const handlePressIn = () => {
    if (!onPress) return;
    RNAnimated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    RNAnimated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  // Render Face Down UNO Card (Classic back)
  if (faceDown || !card) {
    return (
      <View
        testID={testID}
        style={[
          styles.cardBase,
          {
            width: dims.w,
            height: dims.h,
            borderRadius: dims.r,
            borderWidth: dims.border,
            borderColor: '#FFFFFF',
            backgroundColor: '#0F172A',
          },
          styles.cardShadow,
          style,
        ]}
      >
        {/* Inner border */}
        <View style={[styles.innerFrame, { borderRadius: dims.r - 2 }]}>
          {/* Tilted red oval */}
          <View
            style={[
              styles.backOval,
              {
                width: dims.w * 0.85,
                height: dims.h * 0.55,
                borderRadius: dims.w * 0.45,
                backgroundColor: '#DC2626',
              },
            ]}
          >
            <Text
              style={[
                styles.backText,
                {
                  fontSize: Math.max(dims.w * 0.3, 10),
                  letterSpacing: size === 'mini' ? 0.5 : 1.5,
                },
              ]}
            >
              UNO
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const palette = UNO_COLOR_PALETTES[card.color];

  // Helper to render corner symbols
  const renderCornerContent = (isFlipped = false) => {
    if (size === 'mini') return null;

    const cornerFontSize = dims.cornerSize;
    const iconSize = cornerFontSize + 1;

    let content = null;
    if (typeof card.value === 'number') {
      content = (
        <Text style={[styles.cornerNumber, { fontSize: cornerFontSize }]}>
          {card.value}
        </Text>
      );
    } else if (card.value === 'skip') {
      content = <MaterialCommunityIcons name="cancel" size={iconSize} color="#FFFFFF" />;
    } else if (card.value === 'reverse') {
      content = <MaterialCommunityIcons name="sync" size={iconSize} color="#FFFFFF" />;
    } else if (card.value === 'draw2') {
      content = (
        <Text style={[styles.cornerNumber, { fontSize: cornerFontSize * 0.95 }]}>
          +2
        </Text>
      );
    } else if (card.value === 'wild') {
      content = <MaterialCommunityIcons name="star-four-points" size={iconSize} color="#FBBF24" />;
    } else if (card.value === 'wild4') {
      content = (
        <Text style={[styles.cornerNumber, { fontSize: cornerFontSize * 0.9 }]}>
          +4
        </Text>
      );
    }

    return (
      <View
        style={[
          styles.cornerBadge,
          isFlipped ? styles.cornerBottomRight : styles.cornerTopLeft,
          isFlipped && { transform: [{ rotate: '180deg' }] },
        ]}
      >
        {content}
      </View>
    );
  };

  // Center Emblem Content
  const renderCenterContent = () => {
    if (typeof card.value === 'number') {
      return (
        <Text
          style={[
            styles.centerNumber,
            {
              fontSize: dims.numSize,
              color: palette.text,
              textShadowColor: 'rgba(0,0,0,0.18)',
              textShadowOffset: { width: 1, height: 2 },
              textShadowRadius: 2,
            },
          ]}
        >
          {card.value}
        </Text>
      );
    }

    if (card.value === 'skip') {
      return (
        <MaterialCommunityIcons
          name="cancel"
          size={dims.numSize * 1.1}
          color={palette.text}
        />
      );
    }

    if (card.value === 'reverse') {
      return (
        <MaterialCommunityIcons
          name="sync"
          size={dims.numSize * 1.1}
          color={palette.text}
        />
      );
    }

    if (card.value === 'draw2') {
      return (
        <View style={styles.draw2Center}>
          <Text
            style={[
              styles.centerNumber,
              {
                fontSize: dims.numSize * 0.9,
                color: palette.text,
              },
            ]}
          >
            +2
          </Text>
          {size !== 'mini' && (
            <View style={styles.miniCardsRow}>
              <View
                style={[
                  styles.tinyStackedCard,
                  { backgroundColor: palette.text, transform: [{ rotate: '-12deg' }] },
                ]}
              />
              <View
                style={[
                  styles.tinyStackedCard,
                  { backgroundColor: palette.accent, transform: [{ rotate: '10deg' }] },
                ]}
              />
            </View>
          )}
        </View>
      );
    }

    if (card.value === 'wild') {
      return (
        <View
          style={[
            styles.wildCircle,
            {
              width: dims.w * 0.52,
              height: dims.w * 0.52,
              borderRadius: dims.w * 0.26,
            },
          ]}
        >
          {/* 4 Quadrants for authentic Wild look */}
          <View style={[styles.wildQuad, styles.quadTL, { backgroundColor: '#EF4444' }]} />
          <View style={[styles.wildQuad, styles.quadTR, { backgroundColor: '#3B82F6' }]} />
          <View style={[styles.wildQuad, styles.quadBL, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.wildQuad, styles.quadBR, { backgroundColor: '#10B981' }]} />
          {size !== 'mini' && (
            <View style={styles.wildInnerGlow}>
              <MaterialCommunityIcons name="star-four-points" size={dims.numSize * 0.45} color="#FFFFFF" />
            </View>
          )}
        </View>
      );
    }

    if (card.value === 'wild4') {
      return (
        <View style={styles.wild4Center}>
          <View
            style={[
              styles.wildCircle,
              {
                width: dims.w * 0.48,
                height: dims.w * 0.48,
                borderRadius: dims.w * 0.24,
              },
            ]}
          >
            <View style={[styles.wildQuad, styles.quadTL, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.wildQuad, styles.quadTR, { backgroundColor: '#3B82F6' }]} />
            <View style={[styles.wildQuad, styles.quadBL, { backgroundColor: '#F59E0B' }]} />
            <View style={[styles.wildQuad, styles.quadBR, { backgroundColor: '#10B981' }]} />
          </View>
          <Text
            style={[
              styles.wild4Text,
              {
                fontSize: dims.numSize * 0.82,
              },
            ]}
          >
            +4
          </Text>
        </View>
      );
    }

    return null;
  };

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <RNAnimated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        isPlayable && styles.playableGlow,
        isPlayable && styles.playableLift,
        isDimmed && styles.dimmedCard,
        selected && styles.selectedGlow,
      ]}
    >
      <ContainerComponent
        testID={testID}
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={onPress ? handlePressIn : undefined}
        onPressOut={onPress ? handlePressOut : undefined}
        disabled={!onPress}
        style={[
          styles.cardBase,
          {
            width: dims.w,
            height: dims.h,
            borderRadius: dims.r,
            borderWidth: dims.border,
            borderColor: isPlayable ? '#FDE047' : '#FFFFFF',
            backgroundColor: palette.bg,
          },
          styles.cardShadow,
          style,
        ]}
      >
        {/* Inner thin contour line */}
        <View
          style={[
            styles.innerFrame,
            {
              borderRadius: dims.r - 2,
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
          ]}
        >
          {/* Top-left corner index */}
          {renderCornerContent(false)}

          {/* Bottom-right corner index */}
          {renderCornerContent(true)}

          {/* The signature tilted white oval emblem */}
          <View
            style={[
              styles.frontOval,
              {
                width: dims.w * 0.78,
                height: dims.h * 0.65,
                borderRadius: dims.w * 0.38,
                backgroundColor: card.color === 'wild' ? '#0F172A' : '#FFFFFF',
              },
            ]}
          >
            {renderCenterContent()}
          </View>
        </View>
      </ContainerComponent>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  playableGlow: {
    ...Platform.select({
      ios: {
        shadowColor: '#FDE047',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.95,
        shadowRadius: 10,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 0 16px rgba(253, 224, 71, 0.95)',
      },
    }),
  },
  playableLift: {
    transform: [{ translateY: -10 }],
  },
  selectedGlow: {
    ...Platform.select({
      ios: {
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      web: {
        boxShadow: '0 0 18px rgba(56, 189, 248, 1)',
      },
    }),
  },
  dimmedCard: {
    opacity: 0.6,
  },
  innerFrame: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tilted Oval Emblem
  frontOval: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-25deg' }],
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  centerNumber: {
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    includeFontPadding: false,
    transform: [{ rotate: '25deg' }], // Counter-rotate to stay upright
  },
  cornerBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  cornerTopLeft: {
    top: 4,
    left: 4,
  },
  cornerBottomRight: {
    bottom: 4,
    right: 4,
  },
  cornerNumber: {
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0.5, height: 1 },
    textShadowRadius: 1.5,
  },
  // Draw 2 center graphics
  draw2Center: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '25deg' }],
  },
  miniCardsRow: {
    flexDirection: 'row',
    marginTop: -4,
    gap: 3,
  },
  tinyStackedCard: {
    width: 9,
    height: 13,
    borderRadius: 2,
    borderWidth: 0.8,
    borderColor: '#FFFFFF',
  },
  // Wild Circle Quadrants
  wildCircle: {
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '25deg' }],
  },
  wildQuad: {
    position: 'absolute',
    width: '50%',
    height: '50%',
  },
  quadTL: { top: 0, left: 0 },
  quadTR: { top: 0, right: 0 },
  quadBL: { bottom: 0, left: 0 },
  quadBR: { bottom: 0, right: 0 },
  wildInnerGlow: {
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wild4Center: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '25deg' }],
  },
  wild4Text: {
    position: 'absolute',
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  // Card Back
  backOval: {
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-25deg' }],
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  backText: {
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#FACC15',
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
    transform: [{ rotate: '25deg' }],
  },
});
