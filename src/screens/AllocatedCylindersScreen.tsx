import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import ScreenContainer from '../components/common/ScreenContainer';
import ConfirmDeliveryModal from '../components/ui/ConfirmDeliveryModal';
import DeliveryCard from '../components/ui/DeliveryCard';
import { COLORS } from '../constants/colors';
import api from '../services/api';
import { DriverDeliveriesResponse } from '../types';

const DRIVER_ID = 2;

export default function AllocatedCylindersScreen() {
  const router = useRouter();
  const [data, setData] = useState<DriverDeliveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [singleLoadingId, setSingleLoadingId] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchAllocatedDeliveries = useCallback(async () => {
    try {
      setError('');
      const response = await api.get(
        `/drivers/${DRIVER_ID}/app-deliveries?flag=allocated`
      );

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load allocated cylinders');
      }
    } catch (err: any) {
      console.error(
        'fetchAllocatedDeliveries error:',
        err?.response?.data || err.message
      );
      setError('Failed to load allocated cylinders');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchAllocatedDeliveries();
      setLoading(false);
    };

    load();
  }, [fetchAllocatedDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllocatedDeliveries();
    setRefreshing(false);
  };

  const handleOpenConfirm = (item: any) => {
    setSelectedSale(item);
    setConfirmVisible(true);
  };

  const handleConfirmDelivery = async (payload: {
    payment_method: 'CASH' | 'UPI' | 'ONLINE' | 'CREDIT';
    empty_cylinder_qty: number;
  }) => {
    if (!selectedSale) return;

    try {
      setConfirmLoading(true);

      const response = await api.put(`/drivers/sale/${selectedSale.saleId}/deliver`, {
        payment_method: payload.payment_method,
        empty_cylinder_qty: payload.empty_cylinder_qty,
        empty_product_id: 8, // replace with real empty product id
        stock_area_id: 1, // replace with real stock area id
        created_by: 7, // replace with logged in user id
      });

      if (response.data?.success) {
        setConfirmVisible(false);
        setSelectedSale(null);
        await fetchAllocatedDeliveries();
      }
    } catch (err: any) {
      console.error('Confirm delivery error:', err?.response?.data || err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAllDelivered = async () => {
    try {
      const pendingOrAssignedIds =
        data?.deliveries
          ?.filter(
            (item) =>
              item.rawStatus === 'PENDING' || item.rawStatus === 'ASSIGNED'
          )
          .map((item) => item.saleId) || [];

      if (!pendingOrAssignedIds.length) {
        Alert.alert('Info', 'No pending or assigned cylinders to deliver');
        return;
      }

      setBulkLoading(true);

      const response = await api.put(`/drivers/sales/deliver`, {
        saleIds: pendingOrAssignedIds,
      });

      if (response.data?.success) {
        Alert.alert('Success', 'All pending cylinders marked as delivered');
        await fetchAllocatedDeliveries();
      } else {
        Alert.alert(
          'Error',
          response.data?.message || 'Failed to update all deliveries'
        );
      }
    } catch (err: any) {
      console.error('handleAllDelivered error:', err?.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to update all deliveries'
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const progress = useMemo(() => {
    const deliveries = data?.deliveries || [];
    const total = deliveries.length;

    if (!total) return 0;

    const deliveredCount = deliveries.filter(
      (item) => item.rawStatus === 'DELIVERED'
    ).length;

    return Math.round((deliveredCount / total) * 100);
  }, [data]);

  const hasPendingOrAssigned = useMemo(() => {
    return (
      data?.deliveries?.some(
        (item) =>
          item.rawStatus === 'PENDING' || item.rawStatus === 'ASSIGNED'
      ) ?? false
    );
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
          <Text style={styles.pageTitle}>Allocated Cylinders</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading allocated cylinders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAllocatedDeliveries}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressTopRow}>
                <View style={styles.progressIconWrap}>
                  <Ionicons name="cube-outline" size={34} color={COLORS.primary} />
                </View>

                <View style={styles.progressInfo}>
                  <Text style={styles.progressValue}>{progress}%</Text>
                  <Text style={styles.progressLabel}>Delivery Progress</Text>
                </View>
              </View>

              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Today's Deliveries</Text>

            {data?.deliveries?.length ? (
              data.deliveries.map((item) => (
                <DeliveryCard
                  key={item.saleId}
                  name={item.customerName}
                  address={item.address}
                  type={item.product}
                  qty={item.quantity}
                  status={item.status}
                  showMarkDelivered={item.showMarkDelivered}
                  onMarkDelivered={() => handleOpenConfirm(item)}
                  loading={singleLoadingId === item.saleId}
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.infoText}>No allocated deliveries found</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.allDeliveredButton,
                (!hasPendingOrAssigned || bulkLoading) && styles.disabledButton,
              ]}
              onPress={handleAllDelivered}
              disabled={!hasPendingOrAssigned || bulkLoading}
            >
              {bulkLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={26}
                    color={COLORS.white}
                  />
                  <Text style={styles.allDeliveredText}>All Cylinder Delivered</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <ConfirmDeliveryModal
        visible={confirmVisible}
        onClose={() => {
          setConfirmVisible(false);
          setSelectedSale(null);
        }}
        onSubmit={handleConfirmDelivery}
        loading={confirmLoading}
        sale={
          selectedSale
            ? {
              customerName: selectedSale.customerName,
              address: selectedSale.address,
              product: selectedSale.product,
              quantity: selectedSale.quantity,
              totalAmount: selectedSale.totalAmount,
            }
            : null
        }
      />
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
    marginBottom: 22,
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
  progressCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
    marginBottom: 26,
  },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  progressIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },
  progressInfo: {
    flex: 1,
  },
  progressValue: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 52,
  },
  progressLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 20,
    borderRadius: 12,
    backgroundColor: '#ECECEF',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  allDeliveredButton: {
    marginTop: 14,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  allDeliveredText: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '800',
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