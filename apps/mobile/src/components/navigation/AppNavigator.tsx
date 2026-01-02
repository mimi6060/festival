import React, { useEffect } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { OnboardingScreen } from '../../screens/Onboarding/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { TicketDetailScreen } from '../../screens/Tickets/TicketDetailScreen';
import { TopupScreen } from '../../screens/Wallet/TopupScreen';
import { TransactionsScreen } from '../../screens/Wallet/TransactionsScreen';
import { MapScreen } from '../../screens/Map/MapScreen';
import { NotificationsScreen } from '../../screens/Notifications/NotificationsScreen';

import { useAuthStore } from '../../store';
import { pushService } from '../../services';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, hasSeenOnboarding } = useAuthStore();

  useEffect(() => {
    // Configure push notifications
    pushService.configure();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  const getInitialRouteName = (): keyof RootStackParamList => {
    if (!hasSeenOnboarding) return 'Onboarding';
    if (!isAuthenticated) return 'Auth';
    return 'Main';
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.text,
              border: colors.border,
              notification: colors.error,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '900' },
            },
          }}
        >
          <Stack.Navigator
            initialRouteName={getInitialRouteName()}
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            {/* Onboarding */}
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ animation: 'fade' }}
            />

            {/* Auth Flow */}
            <Stack.Screen
              name="Auth"
              component={AuthNavigator}
              options={{ animation: 'fade' }}
            />

            {/* Main App */}
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ animation: 'fade' }}
            />

            {/* Modal Screens */}
            <Stack.Screen
              name="TicketDetail"
              component={TicketDetailScreen}
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="Topup"
              component={TopupScreen}
              options={{
                animation: 'slide_from_bottom',
                presentation: 'modal',
              }}
            />

            <Stack.Screen
              name="Transactions"
              component={TransactionsScreen}
              options={{
                animation: 'slide_from_right',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;
