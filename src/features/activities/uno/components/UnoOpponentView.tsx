/**
 * UnoOpponentView — Displays opponent players with card count,
 * active turn indicators, mini card fanning, and Uno catch trigger.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Player } from '@/src/types/player';
import { UnoCardView } from './UnoCardView';
import { haptics } from '@/src/utils/haptics';

interface UnoOpponentViewProps {
  player: Player;
  cardCount: number;
  isCurrentTurn: boolean;
  hasCalledUno: boolean;
  isVulnerableUno: boolean;
  onCatchUno?: (targetPlayerId: string) => void;
}

export function UnoOpponentView({
  player,
  cardCount,
  isCurrentTurn,
  hasCalledUno,
  isVulnerableUno,
  onCatchUno,
}: UnoOpponentViewProps) {
  const isBot =
    player.id.startsWith('bot_') ||
    player.displayName.toLowerCase().includes('bot') ||
    player.displayName.includes('🤖') ||
    player.displayName.includes('🦊');

  const handleCatch = () => {
    haptics.heavy();
    if (onCatchUno) {
      onCatchUno(player.id);
    }
  };

  return (
    <View
      style={[
        styles.container,
        isCurrentTurn && styles.activeTurnContainer,
      ]}
    >
      {/* Turn indicator banner */}
      {isCurrentTurn && (
        <View style={styles.turnIndicatorPill}>
          <Text style={styles.turnIndicatorText}>TURN</Text>
        </View>
      )}

      {/* Avatar and Name */}
      <View style={styles.avatarRow}>
        <View
          style={[
            styles.avatarCircle,
            { backgroundColor: player.avatarColor || '#6366F1' },
            isCurrentTurn && styles.avatarGlow,
          ]}
        >
          {isBot ? (
            <MaterialCommunityIcons name="robot" size={16} color="#FFFFFF" />
          ) : (
            <Text style={styles.avatarInitial}>
              {player.displayName?.charAt(0).toUpperCase() || 'P'}
            </Text>
          )}
        </View>

        <View style={styles.nameContainer}>
          <Text style={styles.displayName} numberOfLines={1}>
            {player.displayName}
          </Text>
          {isBot && <Text style={styles.botBadge}>BOT</Text>}
        </View>
      </View>

      {/* Cards stack and count */}
      <View style={styles.cardsRow}>
        <View style={styles.miniCardsStack}>
          {/* Fan up to 3 mini facedown cards for realism */}
          {Array.from({ length: Math.min(cardCount, 3) }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.stackedMiniCard,
                {
                  marginLeft: idx === 0 ? 0 : -14,
                  transform: [
                    { rotate: `${(idx - 1) * 8}deg` },
                    { translateY: idx === 1 ? -2 : 0 },
                  ],
                },
              ]}
            >
              <UnoCardView faceDown size="mini" />
            </View>
          ))}
        </View>

        <View
          style={[
            styles.cardCountPill,
            cardCount === 1 && styles.cardCountDanger,
          ]}
        >
          <Text
            style={[
              styles.cardCountText,
              cardCount === 1 && styles.cardCountDangerText,
            ]}
          >
            {cardCount} {cardCount === 1 ? 'card' : 'cards'}
          </Text>
        </View>
      </View>

      {/* Uno Status Badges */}
      {cardCount === 1 && (
        <View style={styles.unoStatusRow}>
          {hasCalledUno ? (
            <View style={styles.unoDeclaredBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FDE047" />
              <Text style={styles.unoDeclaredText}>UNO!</Text>
            </View>
          ) : isVulnerableUno && onCatchUno ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCatch}
              style={styles.catchUnoButton}
            >
              <MaterialCommunityIcons name="alert-octagon" size={12} color="#FFFFFF" />
              <Text style={styles.catchUnoText}>CATCH!</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.unoVulnerableBadge}>
              <Text style={styles.unoVulnerableText}>1 LEFT</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 100,
    maxWidth: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activeTurnContainer: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
      },
    }),
  },
  turnIndicatorPill: {
    position: 'absolute',
    top: -9,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  turnIndicatorText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 6,
  },
  avatarCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarGlow: {
    borderColor: '#38BDF8',
  },
  avatarInitial: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  displayName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F8FAFC',
    flexShrink: 1,
  },
  botBadge: {
    fontSize: 8,
    fontWeight: '900',
    color: '#94A3B8',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  miniCardsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedMiniCard: {
    zIndex: 1,
  },
  cardCountPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardCountDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cardCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  cardCountDangerText: {
    color: '#F87171',
    fontWeight: '800',
  },
  unoStatusRow: {
    marginTop: 6,
    width: '100%',
    alignItems: 'center',
  },
  unoDeclaredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unoDeclaredText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.5,
  },
  catchUnoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
      web: {
        boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
      },
    }),
  },
  catchUnoText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  unoVulnerableBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unoVulnerableText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FBBF24',
  },
});
