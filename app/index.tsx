/**
 * BlitzRoom Home Screen
 * Displays branding, profile customization, and room actions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { useUserStore } from '@/src/features/user/userStore';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Avatar } from '@/src/components/Avatar';
import { AVATAR_COLORS } from '@/src/types/player';
import { haptics } from '@/src/utils/haptics';

export default function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();

  const displayName = useUserStore((state) => state.displayName);
  const avatarColor = useUserStore((state) => state.avatarColor);
  const setDisplayName = useUserStore((state) => state.setDisplayName);
  const setAvatarColor = useUserStore((state) => state.setAvatarColor);
  const generateNewIdentity = useUserStore((state) => state.generateNewIdentity);

  const [nameInput, setNameInput] = useState(displayName);

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setDisplayName(trimmed);
      haptics.success();
    }
  };

  const handleRandomize = () => {
    haptics.medium();
    generateNewIdentity();
    setNameInput(useUserStore.getState().displayName);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Logo */}
        <View style={[styles.header, { marginBottom: spacing.xl }]}>
          <Text style={[typography.headlineLarge, { color: colors.primary, fontWeight: 'bold' }]}>
            Blitz<Text style={{ color: colors.secondary }}>Room</Text>
          </Text>
          <Text style={[typography.bodyMedium, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            Real-time multiplayer party room
          </Text>
        </View>

        {/* Profile Customization Card */}
        <Card style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.titleMedium, { color: colors.textPrimary, marginBottom: spacing.md }]}>
            Your Profile
          </Text>

          <View style={styles.profileSection}>
            <TouchableOpacity onPress={handleRandomize} activeOpacity={0.8}>
              <Avatar name={displayName} color={avatarColor} size={64} />
              <View style={[styles.diceIcon, { backgroundColor: colors.backgroundTertiary }]}>
                <Text style={{ fontSize: 10 }}>🎲</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.inputContainer, { marginLeft: spacing.md }]}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                  },
                ]}
                placeholder="Enter Display Name"
                placeholderTextColor={colors.textTertiary}
                value={nameInput}
                onChangeText={setNameInput}
                onBlur={handleSaveName}
                maxLength={16}
              />
              <TouchableOpacity
                style={[styles.randomBtn, { marginTop: spacing.xs }]}
                onPress={handleRandomize}
              >
                <Text style={[typography.bodySmall, { color: colors.secondary }]}>
                  Random Name
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Color Picker */}
          <Text
            style={[
              typography.bodyMedium,
              { color: colors.textSecondary, marginTop: spacing.md, marginBottom: spacing.sm },
            ]}
          >
            Avatar Color
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {AVATAR_COLORS.slice(0, 10).map((color) => {
              const isSelected = avatarColor === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    {
                      backgroundColor: color,
                      borderColor: isSelected ? '#FFFFFF' : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                      marginRight: spacing.sm,
                    },
                  ]}
                  onPress={() => {
                    haptics.light();
                    setAvatarColor(color);
                  }}
                />
              );
            })}
          </ScrollView>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Create Room"
            onPress={() => {
              handleSaveName();
              router.push('/create');
            }}
            variant="primary"
            size="lg"
            style={{ marginBottom: spacing.md }}
          />

          <Button
            title="Join Room"
            onPress={() => {
              handleSaveName();
              router.push('/join');
            }}
            variant="outline"
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    fontSize: 16,
  },
  randomBtn: {
    alignSelf: 'flex-start',
  },
  diceIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4A5568',
  },
  colorScroll: {
    flexDirection: 'row',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  actions: {
    width: '100%',
  },
});
