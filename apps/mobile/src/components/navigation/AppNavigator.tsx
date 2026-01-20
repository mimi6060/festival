import React, { useEffect, useMemo, memo } from 'react';
import { StatusBar, View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';

import { OnboardingScreen } from '../../screens/Onboarding/OnboardingScreen';
import { AuthNavigator } from './AuthNavigator';
import { MainTabs } from './MainTabs';
import { TicketDetailScreen } from '../../screens/Tickets/TicketDetailScreen';
import { TopupScreen } from '../../screens/Wallet/TopupScreen';
import { TransactionsScreen } from '../../screens/Wallet/TransactionsScreen';
import { MapScreen } from '../../screens/Map/MapScreen';
import { SettingsScreen } from '../../screens/Settings/SettingsScreen';
import { EditProfileScreen, ChangePasswordScreen } from '../../screens/Profile';
import { HelpCenterScreen, ContactUsScreen } from '../../screens/Support';
import { NotificationsScreen } from '../../screens/Notifications/NotificationsScreen';
import { ProfileScreen } from '../../screens/Profile/ProfileScreen';
import { StaffDashboardScreen, StaffValidationScreen, StaffZonesScreen } from '../../screens/Staff';
import { VendorPOSScreen, VendorSelectScreen } from '../../screens/Vendor';

import { useAuthStore } from '../../store';
import { pushService } from '../../services';
import { colors } from '../../theme';
import type { RootStackParamList } from '../../types';

// URL Linking configuration for web
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'http://localhost:8083',
    'http://localhost:4101',
    'https://festival.com',
    'festival://',
  ],
  config: {
    screens: {
      Onboarding: 'onboarding',
      Auth: {
        path: 'auth',
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      Main: {
        path: '',
        screens: {
          Home: 'home',
          Tickets: 'tickets',
          Wallet: 'wallet',
          Program: 'program',
          Profile: 'profile',
        },
      },
      TicketDetail: 'ticket/:ticketId',
      Topup: 'wallet/topup',
      Transactions: 'wallet/transactions',
      Map: 'map',
      Settings: 'settings',
      EditProfile: 'profile/edit',
      ChangePassword: 'profile/password',
      HelpCenter: 'help',
      ContactUs: 'contact',
      Notifications: 'notifications',
    },
  },
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Memoized loading screen component
const LoadingScreen = memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
));

// Optimized screen options for fast transitions (< 300ms target)
const fastSlideOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_right',
  animationDuration: 250, // Target < 300ms
  gestureEnabled: true,
};

const fastFadeOptions: NativeStackNavigationOptions = {
  animation: 'fade',
  animationDuration: 200, // Fast fade for auth/main transitions
};

const modalOptions: NativeStackNavigationOptions = {
  animation: 'slide_from_bottom',
  animationDuration: 250,
  presentation: 'modal',
  gestureEnabled: true,
};

// Staff roles that should see staff mode
const STAFF_ROLES = ['STAFF', 'CASHIER', 'SECURITY', 'ORGANIZER', 'ADMIN'];

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, hasSeenOnboarding, user } = useAuthStore();

  useEffect(() => {
    // Configure push notifications
    pushService.configure();
  }, []);

  // Check if user is staff
  const isStaffMember = useMemo(() => {
    if (!user?.role) {
      return false;
    }
    return STAFF_ROLES.includes(user.role);
  }, [user?.role]);

  // Memoize initial route to prevent recalculation
  const initialRouteName = useMemo((): keyof RootStackParamList => {
    if (!hasSeenOnboarding) {
      return 'Onboarding';
    }
    if (!isAuthenticated) {
      return 'Auth';
    }
    // Staff members go to StaffDashboard, regular users to Main
    if (isStaffMember) {
      return 'StaffDashboard';
    }
    return 'Main';
  }, [hasSeenOnboarding, isAuthenticated, isStaffMember]);

  // Memoize theme to prevent unnecessary re-renders
  const navigationTheme = useMemo(
    () => ({
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
        regular: { fontFamily: 'System', fontWeight: '400' as const },
        medium: { fontFamily: 'System', fontWeight: '500' as const },
        bold: { fontFamily: 'System', fontWeight: '700' as const },
        heavy: { fontFamily: 'System', fontWeight: '900' as const },
      },
    }),
    []
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <NavigationContainer
        linking={Platform.OS === 'web' ? linking : undefined}
        theme={navigationTheme}
      >
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250, // Optimized for < 300ms transitions
            contentStyle: { backgroundColor: colors.background },
            // Enable native driver for smoother animations
            freezeOnBlur: true, // Freeze inactive screens to save memory
          }}
        >
          {/* Onboarding - Fast fade */}
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={fastFadeOptions} />

          {/* Auth Flow - Fast fade */}
          <Stack.Screen name="Auth" component={AuthNavigator} options={fastFadeOptions} />

          {/* Main App - Fast fade */}
          <Stack.Screen name="Main" component={MainTabs} options={fastFadeOptions} />

          {/* Modal Screens - Optimized modal transitions */}
          <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={modalOptions} />

          <Stack.Screen name="Topup" component={TopupScreen} options={modalOptions} />

          {/* Stack Screens - Fast slide transitions */}
          <Stack.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen name="Map" component={MapScreen} options={fastSlideOptions} />

          <Stack.Screen name="Settings" component={SettingsScreen} options={fastSlideOptions} />

          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={fastSlideOptions} />

          <Stack.Screen name="ContactUs" component={ContactUsScreen} options={fastSlideOptions} />

          {/* Staff Mode Screens */}
          <Stack.Screen
            name="StaffDashboard"
            component={StaffDashboardScreen}
            options={fastFadeOptions}
          />

          <Stack.Screen
            name="StaffValidation"
            component={StaffValidationScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen name="StaffZones" component={StaffZonesScreen} options={fastSlideOptions} />

          {/* Vendor/POS Screens */}
          <Stack.Screen name="VendorPOS" component={VendorPOSScreen} options={fastSlideOptions} />
          <Stack.Screen
            name="VendorSelect"
            component={VendorSelectScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={fastSlideOptions}
          />

          <Stack.Screen name="Profile" component={ProfileScreen} options={fastSlideOptions} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
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
