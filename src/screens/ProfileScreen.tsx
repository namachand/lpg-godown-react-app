import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import ScreenContainer from '../components/common/ScreenContainer';
import { APP_ROLE_KEY, APP_ROLES, AppRole } from '../constants/appRole';
import { COLORS } from '../constants/colors';
import api from '../services/api';
import { DriverProfileHistoryResponse } from '../types';

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

const formatDateLabel = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const getPaymentLabel = (mode?: string) => {
  if (!mode) return 'N/A';
  if (mode === 'CARD') return 'Online';
  if (mode === 'CASH') return 'Cash';
  return mode;
};

type ProfileScreenProps = {
  onRoleChange?: (role: AppRole) => void;
};

export default function ProfileScreen({ onRoleChange }: ProfileScreenProps) {
  const [data, setData] = useState<DriverProfileHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<AppRole>(APP_ROLES.DRIVER);

  const fetchProfileHistory = useCallback(async (pageNumber = 1) => {
    try {
      setError('');

      const response = await api.get(
        `/drivers/${DRIVER_ID}/profile-history?page=${pageNumber}&limit=2`
      );

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load profile history');
      }
    } catch (err: any) {
      console.error('fetchProfileHistory error:', err?.response?.data || err.message);
      setError('Failed to load profile history');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchProfileHistory(page);
      setLoading(false);
    };

    load();
  }, [fetchProfileHistory, page]);

  useEffect(() => {
    const loadRole = async () => {
      const role = await AsyncStorage.getItem(APP_ROLE_KEY);

      if (role === APP_ROLES.DRIVER || role === APP_ROLES.GODOWN_MANAGER) {
        setSelectedRole(role);
      } else {
        setSelectedRole(APP_ROLES.DRIVER);
      }
    };

    loadRole();
  }, []);

  const handleRoleChange = async (role: AppRole) => {
    await AsyncStorage.setItem(APP_ROLE_KEY, role);
    setSelectedRole(role);

    DeviceEventEmitter.emit('APP_ROLE_CHANGED', role);

    if (role === APP_ROLES.GODOWN_MANAGER) {
      router.replace('/godown-home');
    } else {
      router.replace('/');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileHistory(page);
    setRefreshing(false);
  };

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppHeader />

      <View style={styles.roleSwitchWrap}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === APP_ROLES.DRIVER && styles.roleButtonActive,
          ]}
          onPress={() => handleRoleChange(APP_ROLES.DRIVER)}
        >
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === APP_ROLES.DRIVER && styles.roleButtonTextActive,
            ]}
          >
            Driver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.roleButton,
            selectedRole === APP_ROLES.GODOWN_MANAGER && styles.roleButtonActive,
          ]}
          onPress={() => handleRoleChange(APP_ROLES.GODOWN_MANAGER)}
        >
          <Text
            style={[
              styles.roleButtonText,
              selectedRole === APP_ROLES.GODOWN_MANAGER &&
              styles.roleButtonTextActive,
            ]}
          >
            Godown Manager
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading profile history...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Performance</Text>

            <View style={styles.performanceWrap}>
              <View style={styles.performanceCard}>
                <View style={[styles.performanceIconWrap, { backgroundColor: COLORS.greenSoft }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.green} />
                </View>
                <Text style={styles.performanceLabel}>Today</Text>
                <Text style={[styles.performanceValue, { color: COLORS.green }]}>
                  {data?.performance?.today ?? 0}
                </Text>
              </View>

              <View style={styles.performanceCard}>
                <View style={[styles.performanceIconWrap, { backgroundColor: COLORS.blueSoft }]}>
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                </View>
                <Text style={styles.performanceLabel}>This Week</Text>
                <Text style={[styles.performanceValue, { color: COLORS.primary }]}>
                  {data?.performance?.thisWeek ?? 0}
                </Text>
              </View>

              <View style={styles.performanceCard}>
                <View style={[styles.performanceIconWrap, { backgroundColor: COLORS.orangeSoft }]}>
                  <Ionicons name="trophy-outline" size={16} color={COLORS.orange} />
                </View>
                <Text style={styles.performanceLabel}>Total</Text>
                <Text style={[styles.performanceValue, { color: COLORS.orange }]}>
                  {data?.performance?.total ?? 0}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Delivery History</Text>

            {data?.items?.map((dayItem, index) => (
              <View key={`${dayItem.date}-${index}`} style={styles.dayCard}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayLeft}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.dayDateText}>{formatDateLabel(dayItem.date)}</Text>
                  </View>

                  <View style={styles.dayRight}>
                    <Text style={styles.dayAmount}>₹{dayItem.totalAmount}</Text>
                    <Text style={styles.dayDeliveries}>
                      {dayItem.totalDeliveries} deliveries
                    </Text>
                  </View>
                </View>

                {dayItem.deliveries.map((item) => {
                  const paymentLabel = getPaymentLabel(item.paymentMode);
                  const isCommercial = item.cylinderType === 'COMMERCIAL';

                  return (
                    <View key={item.saleId} style={styles.deliveryRow}>
                      <View style={styles.rowLeft}>
                        <View
                          style={[
                            styles.iconWrap,
                            {
                              backgroundColor: isCommercial
                                ? COLORS.orangeSoft
                                : COLORS.blueSoft,
                            },
                          ]}
                        >
                          <Ionicons
                            name="cube-outline"
                            size={16}
                            color={isCommercial ? COLORS.orange : COLORS.primary}
                          />
                        </View>

                        <View style={styles.rowTextWrap}>
                          <Text style={styles.customerName}>{item.customerName}</Text>
                          <Text style={styles.metaText}>
                            {formatTime(item.deliveredAt)} · {item.address}
                          </Text>
                          <Text style={styles.subMetaText}>
                            {isCommercial ? 'Commercial' : 'Domestic'} × {item.quantity}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.rowRight}>
                        <Text style={styles.amountText}>₹{item.totalAmount}</Text>

                        <View
                          style={[
                            styles.paymentBadge,
                            paymentLabel === 'Cash'
                              ? styles.cashBadge
                              : paymentLabel === 'UPI'
                                ? styles.upiBadge
                                : styles.onlineBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.paymentBadgeText,
                              paymentLabel === 'Cash'
                                ? styles.cashText
                                : paymentLabel === 'UPI'
                                  ? styles.upiText
                                  : styles.onlineText,
                            ]}
                          >
                            {paymentLabel}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}

            <View style={styles.paginationWrap}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !data?.pagination?.hasPrevPage && styles.pageButtonDisabled,
                ]}
                disabled={!data?.pagination?.hasPrevPage}
                onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
                <Text style={styles.pageButtonText}>Newer</Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                Page {data?.pagination?.page || 1} of {data?.pagination?.totalPages || 1}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !data?.pagination?.hasNextPage && styles.pageButtonDisabled,
                ]}
                disabled={!data?.pagination?.hasNextPage}
                onPress={() => setPage((prev) => prev + 1)}
              >
                <Text style={styles.pageButtonText}>Older</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  performanceWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  performanceCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  performanceIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  dayCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayDateText: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dayRight: {
    alignItems: 'flex-end',
  },
  dayAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  dayDeliveries: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deliveryRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  rowTextWrap: {
    flex: 1,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  subMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rowRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cashBadge: {
    backgroundColor: COLORS.greenSoft,
  },
  cashText: {
    color: COLORS.green,
  },
  upiBadge: {
    backgroundColor: COLORS.blueSoft,
  },
  upiText: {
    color: COLORS.primary,
  },
  onlineBadge: {
    backgroundColor: COLORS.orangeSoft,
  },
  onlineText: {
    color: COLORS.orange,
  },
  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 10,
    marginTop: 4,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  pageButtonDisabled: {
    opacity: 0.4,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
  },
  roleSwitchWrap: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  roleButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blueSoft,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: COLORS.primary,
  },
});