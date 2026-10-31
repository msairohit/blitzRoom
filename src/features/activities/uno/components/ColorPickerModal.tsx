/**
 * ColorPickerModal — Modal prompt for selecting the next active color
 * when playing a Wild or Wild Draw 4 card.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';
import type { UnoActiveColor } from '../types';

interface ColorPickerModalProps {
  visible: boolean;
  onSelectColor: (color: UnoActiveColor) => void;
  cardName?: string;
}

const COLOR_OPTIONS: Array<{
  id: UnoActiveColor;
  label: string;
  bg: string;
  accent: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { id: 'red', label: 'RED', bg: '#EF4444', accent: '#DC2626', icon: 'cards-heart' },
  { id: 'blue', label: 'BLUE', bg: '#2563EB', accent: '#1D4ED8', icon: 'cards-diamond' },
  { id: 'green', label: 'GREEN', bg: '#10B981', accent: '#059669', icon: 'cards-club' },
  { id: 'yellow', label: 'YELLOW', bg: '#F59E0B', accent: '#D97706', icon: 'cards-spade' },
];

export function ColorPickerModal({
  visible,
  onSelectColor,
  cardName = 'Wild Card',
}: ColorPickerModalProps) {
  if (!visible) return null;

  const handleSelect = (color: UnoActiveColor) => {
    haptics.heavy();
    onSelectColor(color);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="star-four-points" size={28} color="#FBBF24" />
            <Text style={styles.title}>Choose Next Color</Text>
            <Text style={styles.subtitle}>
              You played {cardName}! Pick the color for the next player:
            </Text>
          </View>

          {/* 2x2 Grid of Color Buttons */}
          <View style={styles.grid}>
            {COLOR_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.8}
                onPress={() => handleSelect(opt.id)}
                style={[
                  styles.colorButton,
                  { backgroundColor: opt.bg, borderColor: opt.accent },
                ]}
              >
                <MaterialCommunityIcons name={opt.icon} size={36} color="#FFFFFF" />
                <Text style={styles.buttonLabel}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
      web: {
        boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'center',
    width: '100%',
  },
  colorButton: {
    width: '46%',
    aspectRatio: 1.1,
    borderRadius: 18,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
      },
    }),
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
