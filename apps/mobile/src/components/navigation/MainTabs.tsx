import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../../screens/Home/HomeScreen';
import { MyTicketsScreen } from '../../screens/Tickets/MyTicketsScreen';
import { WalletScreen } from '../../screens/Wallet/WalletScreen';
import { ProgramScreen } from '../../screens/Program/ProgramScreen';
import { ProfileScreen } from '../../screens/Profile/ProfileScreen';
import { useNotificationStore } from '../../store';
import { colors, spacing, typography } from '../../theme';
import type { MainTabParamList } from '../../types';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  focused: boolean;
  icon: string;
  label: string;
  badge?: number;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, label, badge }) => (
  <View style={styles.tabIconContainer}>
    <View style={styles.iconWrapper}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>{icon}</Text>
      {badge && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
  </View>
);

export const MainTabs: React.FC = () => {
  const { unreadCount } = useNotificationStore();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🏠" label="Accueil" />,
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={MyTicketsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="🎟️" label="Billets" />,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="💳" label="Wallet" />,
        }}
      />
      <Tab.Screen
        name="Program"
        component={ProgramScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon="📅" label="Programme" />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon="👤" label="Profil" badge={unreadCount} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Standardized tab bar colors
const TAB_BAR_COLORS = {
  background: '#0a0a0a',
  borderTop: 'rgba(255,255,255,0.1)',
  activeTint: '#6366f1',
  inactiveTint: 'rgba(255,255,255,0.5)',
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: TAB_BAR_COLORS.background,
    borderTopColor: TAB_BAR_COLORS.borderTop,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 70,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.sm,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabIconFocused: {
    transform: [{ scale: 1.1 }],
  },
  tabLabel: {
    ...typography.caption,
    color: TAB_BAR_COLORS.inactiveTint,
    fontSize: 11,
  },
  tabLabelFocused: {
    color: TAB_BAR_COLORS.activeTint,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default MainTabs;
