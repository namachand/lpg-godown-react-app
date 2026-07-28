import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { DS, TYPO, RADIUS, PALETTE } from '../../constants/designSystem';

type Props = {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'blue' | 'green' | 'orange' | 'red';
  subLabel?: string;
  onPress?: () => void;
  style?: ViewStyle;
};

const toneMap = {
  blue: { bg: DS.primarySoft, color: DS.primary },
  green: { bg: DS.greenSoft, color: PALETTE.green600 },
  orange: { bg: DS.orangeSoft, color: DS.orange },
  red: { bg: DS.redSoft, color: DS.red },
};

export default function StatCard({
  title,
  value,
  icon,
  tone = 'blue',
  subLabel,
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
      {subLabel && <Text style={styles.subLabel}>{subLabel}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '31.5%',
    backgroundColor: DS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: DS.border,
    marginBottom: 12,
  },
  iconWrap: {
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    overflow: 'hidden',
  },
  value: {
    ...TYPO.h5,
    color: DS.textPrimary,
    marginBottom: 6,
  },
  title: {
    ...TYPO.c2,
    color: DS.textSecondary,
    textAlign: 'center',
  },
  subLabel: {
    ...TYPO.c3,
    color: DS.textTertiary,
    textAlign: 'center',
    marginTop: 4,
  },
});