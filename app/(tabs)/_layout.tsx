import { Feather, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

import { APP_ROLE_KEY, APP_ROLES, AppRole } from '../../src/constants/appRole';
import { COLORS } from '../../src/constants/colors';

export default function TabsLayout() {
  const [role, setRole] = useState<AppRole>(APP_ROLES.DRIVER);

  const loadRole = async () => {
    const savedRole = await AsyncStorage.getItem(APP_ROLE_KEY);

    if (
      savedRole === APP_ROLES.DRIVER ||
      savedRole === APP_ROLES.GODOWN_MANAGER
    ) {
      setRole(savedRole);
    } else {
      setRole(APP_ROLES.DRIVER);
    }
  };

  useEffect(() => {
    loadRole();

    const sub = DeviceEventEmitter.addListener(
      'APP_ROLE_CHANGED',
      (newRole: AppRole) => {
        setRole(newRole);
      }
    );

    return () => sub.remove();
  }, []);

  const isDriver = role === APP_ROLES.DRIVER;
  const isGodown = role === APP_ROLES.GODOWN_MANAGER;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mutedText,
        tabBarStyle: {
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* DRIVER TABS */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Deliveries',
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Feather name="truck" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add"
        options={{
          title: 'New Booking',
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          href: isDriver ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* GODOWN TABS */}
      <Tabs.Screen
        name="godown-home"
        options={{
          title: 'Dashboard',
          href: isGodown ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          href: isGodown ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="drivers"
        options={{
          title: 'Drivers',
          href: isGodown ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="godown-profile"
        options={{
          title: 'Profile',
          href: isGodown ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}