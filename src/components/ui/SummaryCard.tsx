import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  amount: string;
  customer: string;
  time: string;
  buttonText: string;
  buttonColor: string;
  onPress?: () => void;
  loading?: boolean;
};

export default function SummaryCard({
  icon,
  iconBg,
  iconColor,
  title,
  amount,
  customer,
  time,
  buttonText,
  buttonColor,
  onPress,
  loading = false,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headRow}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>

        <View style={styles.headText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.amount}>{amount}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View>
          <Text style={styles.customer}>{customer}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.rightAmount}>{amount}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: buttonColor }, loading && styles.disabled]}
        onPress={onPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  customer: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  time: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  rightAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});