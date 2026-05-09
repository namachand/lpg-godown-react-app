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
  name: string;
  address: string;
  type: string;
  qty: number;
  status: 'Delivered' | 'Pending' | 'Cancelled';
  showMarkDelivered?: boolean;
  onMarkDelivered?: () => void;
  loading?: boolean;
};

export default function DeliveryCard({
  name,
  address,
  type,
  qty,
  status,
  showMarkDelivered = false,
  onMarkDelivered,
  loading = false,
}: Props) {
  const isDelivered = status === 'Delivered';
  const isCancelled = status === 'Cancelled';

  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.infoWrap}>
          <Text style={styles.name}>{name}</Text>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.address}>{address}</Text>
          </View>

          <Text style={styles.qty}>
            {type} · Qty: {qty}
          </Text>
        </View>

        <View
          style={[
            styles.badge,
            isDelivered
              ? styles.deliveredBadge
              : isCancelled
              ? styles.cancelledBadge
              : styles.pendingBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isDelivered
                ? styles.deliveredText
                : isCancelled
                ? styles.cancelledText
                : styles.pendingText,
            ]}
          >
            {status}
          </Text>
        </View>
      </View>

      {showMarkDelivered && (
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={onMarkDelivered}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.buttonText}>Mark Delivered</Text>
            </>
          )}
        </TouchableOpacity>
      )}
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
    marginBottom: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoWrap: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  address: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },
  qty: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  deliveredBadge: {
    backgroundColor: COLORS.greenSoft,
  },
  pendingBadge: {
    backgroundColor: COLORS.orangeSoft,
  },
  cancelledBadge: {
    backgroundColor: COLORS.redSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deliveredText: {
    color: COLORS.green,
  },
  pendingText: {
    color: COLORS.orange,
  },
  cancelledText: {
    color: COLORS.red,
  },
  button: {
    marginTop: 14,
    backgroundColor: COLORS.buttonGreen,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});