import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BlitzThemeProvider, useTheme } from '@/src/theme';
import { useUserStore } from '@/src/features/user/userStore';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

function RootLayoutContent() {
  const { colors } = useTheme();
  const initializeUser = useUserStore((state) => state.initialize);
  const isInitialized = useUserStore((state) => state.isInitialized);

  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  if (!isInitialized) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#0B1120' }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="join/index" options={{ title: 'Join Room', headerBackTitle: 'Back' }} />
      <Stack.Screen name="create/index" options={{ title: 'Select Activity', headerBackTitle: 'Back' }} />
      <Stack.Screen name="create/[activity]" options={{ title: 'Activity Settings', headerBackTitle: 'Back' }} />
      <Stack.Screen name="room/[code]" options={{ headerShown: false }} />
      <Stack.Screen name="play/[roomId]" options={{ headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BlitzThemeProvider>
        <RootLayoutContent />
        <StatusBar style="light" />
      </BlitzThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
