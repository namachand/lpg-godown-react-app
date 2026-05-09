import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

type Props = {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'blue' | 'green' | 'orange' | 'red';
  onPress?: () => void;
  style?: ViewStyle;
};

const toneMap = {
  blue: { bg: COLORS.blueSoft, color: COLORS.primary },
  green: { bg: COLORS.greenSoft, color: COLORS.green },
  orange: { bg: COLORS.orangeSoft, color: COLORS.orange },
  red: { bg: COLORS.redSoft, color: COLORS.red },
};

export default function StatCard({
  title,
  value,
  icon,
  tone = 'blue',
  onPress,
  style,
}: Props) {
  const current = toneMap[tone];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, style]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Ionicons
        name={icon}
        size={24}
        color={current.color}
        style={[styles.iconWrap, { backgroundColor: current.bg }]}
      />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  iconWrap: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});