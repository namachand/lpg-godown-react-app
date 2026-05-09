import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import ScreenContainer from '../components/common/ScreenContainer';
import { COLORS } from '../constants/colors';
import api from '../services/api';
import { DriverDeliveriesResponse } from '../types';

const DRIVER_ID = 2;

const formatTime = (value?: string | null) => {
  if (!value) return '';
  try {
    const date = new Date(value);
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

export default function DeliveredCylindersScreen() {
  const router = useRouter();
  const [data, setData] = useState<DriverDeliveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDeliveredDeliveries = useCallback(async () => {
    try {
      setError('');
      const response = await api.get(
        `/drivers/${DRIVER_ID}/app-deliveries?flag=delivered`
      );

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load delivered cylinders');
      }
    } catch (err: any) {
      console.error(
        'fetchDeliveredDeliveries error:',
        err?.response?.data || err.message
      );
      setError('Failed to load delivered cylinders');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDeliveredDeliveries();
      setLoading(false);
    };

    load();
  }, [fetchDeliveredDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveredDeliveries();
    setRefreshing(false);
  };

  const deliveredCount = useMemo(() => {
    return data?.deliveries?.length ?? 0;
  }, [data]);

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Delivered Cylinders</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading delivered cylinders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDeliveredDeliveries}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={26}
                    color={COLORS.green}
                  />
                </View>
                <View>
                  <Text style={styles.summaryValue}>{deliveredCount}</Text>
                  <Text style={styles.summaryLabel}>Total Deliveries Today</Text>
                </View>
              </View>
            </View>

            {data?.deliveries?.length ? (
              data.deliveries.map((item) => (
                <View key={item.saleId} style={styles.deliveryCard}>
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardInfoWrap}>
                      <Text style={styles.name}>{item.customerName}</Text>

                      <View style={styles.addressRow}>
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.address}>{item.address}</Text>
                      </View>

                      <Text style={styles.meta}>
                        {item.product} · Qty: {item.quantity} · ₹{item.totalAmount}
                      </Text>
                    </View>

                    <View style={styles.rightWrap}>
                      <View style={styles.paymentBadge}>
                        <Text style={styles.paymentBadgeText}>
                          {item.paymentMode === 'CARD' ? 'Online' : item.paymentMode}
                        </Text>
                      </View>

                      <Text style={styles.timeText}>
                        {formatTime(item.deliveredAt || item.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.infoText}>No delivered cylinders found</Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backButton: {
    marginRight: 14,
    padding: 2,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  summaryCard: {
    backgroundColor: '#EEF8EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDF2DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.green,
    lineHeight: 26,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deliveryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardInfoWrap: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flexShrink: 1,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightWrap: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  paymentBadge: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: 'center',
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: 'center',
  },
});