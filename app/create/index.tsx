/**
 * Create Room — Activity Picker Screen
 * Lists all available games/activities for the admin to select.
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/src/theme';
import { getActivityList } from '@/src/features/activities/registry';
import { ActivityCard } from '@/src/components/ActivityCard';
import { haptics } from '@/src/utils/haptics';

export default function ActivityPickerScreen() {
  const { colors, spacing, typography } = useTheme();
  const router = useRouter();
  const activities = getActivityList();

  const handleSelect = (activityId: string) => {
    haptics.medium();
    router.push(`/create/${activityId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: spacing.lg }]}>
      <Text style={[typography.titleMedium, { color: colors.textSecondary, marginVertical: spacing.md }]}>
        Choose an activity for your room:
      </Text>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onPress={() => handleSelect(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
