import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
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

const DRIVER_ID = 2;

type DriverProfileDelivery = {
  saleId: number;
  customerName: string;
  address: string;
  cylinderType: string;
  quantity: number;
  totalAmount: number;
  paymentMode: string;
  deliveredAt: string;
};

type DriverProfileDay = {
  date: string;
  totalAmount: number;
  totalDeliveries: number;
  deliveries: DriverProfileDelivery[];
};

type DriverProfileResponse = {
  driver: {
    id: number;
    name: string;
    phone: string;
    vehicleNumber: string;
  };
  performance: {
    today: number;
    thisWeek: number;
    total: number;
  };
  items: DriverProfileDay[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

type BookingItem = {
  saleId: number;
  customerName: string;
  phone: string;
  address: string;
  status: 'PENDING' | 'ASSIGNED' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  totalQty: number;
  cylinderType: 'DOMESTIC' | 'COMMERCIAL';
  productSummary: string;
  createdAt: string;
  deliveredAt?: string | null;
};

type BookingsResponse = {
  total: number;
  items: BookingItem[];
};

type ProfileScreenProps = {
  onRoleChange?: (role: AppRole) => void;
};

const formatTime = (value?: string | null) => {
  if (!value) return '';

  try {
    return new Date(value).toLocaleTimeString([], {
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
    const today = new Date();

    const formatted = date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    if (date.toDateString() === today.toDateString()) {
      return `Today — ${formatted}`;
    }

    return formatted;
  } catch {
    return dateString;
  }
};

const getPaymentLabel = (mode?: string) => {
  if (!mode) return 'N/A';

  const value = mode.toUpperCase();

  if (value === 'CARD' || value === 'ONLINE') return 'Online';
  if (value === 'CASH') return 'Cash';
  if (value === 'UPI') return 'UPI';
  if (value === 'CREDIT') return 'Credit';

  return value;
};

const getInitials = (name?: string) => {
  if (!name) return 'DR';

  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const getStatusLabel = (status: string) => {
  if (status === 'PENDING') return 'Pending';
  if (status === 'DELIVERED') return 'Delivered';
  if (status === 'CANCELLED') return 'Cancelled';
  return status;
};

export default function ProfileScreen({ onRoleChange }: ProfileScreenProps) {
  const [screenMode, setScreenMode] = useState<'PROFILE' | 'BOOKINGS'>(
    'PROFILE'
  );

  const [data, setData] = useState<DriverProfileResponse | null>(null);
  const [bookings, setBookings] = useState<BookingsResponse>({
    total: 0,
    items: [],
  });

  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRole, setSelectedRole] = useState<AppRole>(APP_ROLES.DRIVER);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(
    null
  );
  const [cancelLoading, setCancelLoading] = useState(false);

  const fetchProfileHistory = useCallback(async (pageNumber = 1) => {
    try {
      setError('');

      const response = await api.get(
        `/drivers/${DRIVER_ID}/profile-history?page=${pageNumber}&limit=4`
      );

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load profile history');
      }
    } catch (err: any) {
      console.error(
        'fetchProfileHistory error:',
        err?.response?.data || err.message
      );
      setError('Failed to load profile history');
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);

      const response = await api.get(`/drivers/${DRIVER_ID}/bookings`);

      if (response.data?.success) {
        setBookings({
          total: response.data.data?.total || 0,
          items: response.data.data?.items || [],
        });
      }
    } catch (err: any) {
      console.error('fetchBookings error:', err?.response?.data || err.message);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchProfileHistory(page), fetchBookings()]);
      setLoading(false);
    };

    load();
  }, [fetchProfileHistory, fetchBookings, page]);

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

    if (onRoleChange) {
      onRoleChange(role);
    }

    if (role === APP_ROLES.GODOWN_MANAGER) {
      router.replace('/godown-home');
    } else {
      router.replace('/');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);

    if (screenMode === 'BOOKINGS') {
      await fetchBookings();
    } else {
      await Promise.all([fetchProfileHistory(page), fetchBookings()]);
    }

    setRefreshing(false);
  };

  const openBookings = async () => {
    setScreenMode('BOOKINGS');
    await fetchBookings();
  };

  const openCancelModal = (booking: BookingItem) => {
    setSelectedBooking(booking);
    setCancelModalVisible(true);
  };

  const cancelBooking = async () => {
    if (!selectedBooking) return;

    try {
      setCancelLoading(true);

      const response = await api.put(
        `/drivers/bookings/${selectedBooking.saleId}/cancel`,
        {
          driver_id: DRIVER_ID,
        }
      );

      if (response.data?.success) {
        setCancelModalVisible(false);
        setSelectedBooking(null);
        await fetchBookings();
      }
    } catch (err: any) {
      console.error('cancelBooking error:', err?.response?.data || err.message);
    } finally {
      setCancelLoading(false);
    }
  };

  if (screenMode === 'BOOKINGS') {
    return (
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AppHeader />

        <View style={styles.content}>
          <View style={styles.bookingHeaderRow}>
            <TouchableOpacity
              style={styles.backSquare}
              onPress={() => setScreenMode('PROFILE')}
            >
              <Ionicons
                name="arrow-back"
                size={28}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <View>
              <Text style={styles.bookingPageTitle}>My Bookings</Text>
              <Text style={styles.bookingCount}>{bookings.total} total</Text>
            </View>
          </View>

          {bookingsLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.infoText}>Loading bookings...</Text>
            </View>
          ) : bookings.items.length ? (
            bookings.items.map((item) => (
              <BookingCard
                key={item.saleId}
                item={item}
                onCancel={() => openCancelModal(item)}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No bookings found</Text>
            </View>
          )}
        </View>

        <CancelBookingModal
          visible={cancelModalVisible}
          loading={cancelLoading}
          onCancel={cancelBooking}
          onKeep={() => {
            setCancelModalVisible(false);
            setSelectedBooking(null);
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppHeader />

      <View style={styles.content}>
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
                selectedRole === APP_ROLES.DRIVER &&
                  styles.roleButtonTextActive,
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === APP_ROLES.GODOWN_MANAGER &&
                styles.roleButtonActive,
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
            <View style={styles.profileCard}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileInitials}>
                  {getInitials(data?.driver?.name)}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {data?.driver?.name || 'Driver'}
                </Text>

                <View style={styles.profileMetaRow}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.profileMeta}>
                    {data?.driver?.phone || 'N/A'}
                  </Text>
                </View>

                <View style={styles.profileMetaRow}>
                  <Ionicons
                    name="car-outline"
                    size={18}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.profileMeta}>
                    {data?.driver?.vehicleNumber || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.sectionTitle}>PERFORMANCE</Text>

            <View style={styles.performanceWrapVertical}>
              <PerformanceRow
                icon="checkmark-circle-outline"
                label="Today"
                value={data?.performance?.today ?? 0}
                color={COLORS.green}
                bg={COLORS.greenSoft}
              />

              <PerformanceRow
                icon="calendar-outline"
                label="This Week"
                value={data?.performance?.thisWeek ?? 0}
                color={COLORS.primary}
                bg={COLORS.blueSoft}
              />

              <PerformanceRow
                icon="trophy-outline"
                label="Total"
                value={data?.performance?.total ?? 0}
                color={COLORS.orange}
                bg={COLORS.orangeSoft}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.myBookingsCard}
              onPress={openBookings}
            >
              <View style={styles.myBookingLeft}>
                <View style={styles.myBookingIcon}>
                  <Ionicons
                    name="clipboard-outline"
                    size={30}
                    color={COLORS.primary}
                  />
                </View>

                <View>
                  <Text style={styles.myBookingTitle}>My Bookings</Text>
                  <Text style={styles.myBookingSub}>
                    View all your booking history
                  </Text>
                </View>
              </View>

              <View style={styles.myBookingRight}>
                <Text style={styles.myBookingCount}>{bookings.total}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={26}
                  color={COLORS.textSecondary}
                />
              </View>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>DELIVERY HISTORY</Text>

            {data?.items?.length ? (
              data.items.map((dayItem, index) => (
                <View key={`${dayItem.date}-${index}`} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayLeft}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.dayDateText}>
                        {formatDateLabel(dayItem.date)}
                      </Text>
                    </View>

                    <View style={styles.dayRight}>
                      <Text style={styles.dayAmount}>
                        ₹{dayItem.totalAmount.toLocaleString('en-IN')}
                      </Text>
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
                              size={20}
                              color={
                                isCommercial ? COLORS.orange : COLORS.primary
                              }
                            />
                          </View>

                          <View style={styles.rowTextWrap}>
                            <Text style={styles.customerName} numberOfLines={1}>
                              {item.customerName}
                            </Text>

                            <Text style={styles.metaText} numberOfLines={1}>
                              {formatTime(item.deliveredAt)} · {item.address}
                            </Text>

                            <Text style={styles.subMetaText}>
                              {isCommercial ? 'Commercial' : 'Domestic'} ×{' '}
                              {item.quantity}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.rowRight}>
                          <Text style={styles.amountText}>
                            ₹{item.totalAmount.toLocaleString('en-IN')}
                          </Text>

                          <View
                            style={[
                              styles.paymentBadge,
                              paymentLabel === 'Cash'
                                ? styles.cashBadge
                                : paymentLabel === 'UPI'
                                ? styles.upiBadge
                                : paymentLabel === 'Credit'
                                ? styles.creditBadge
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
                                  : paymentLabel === 'Credit'
                                  ? styles.creditText
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
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No delivery history found</Text>
              </View>
            )}

            <View style={styles.paginationWrap}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !data?.pagination?.hasPrevPage && styles.pageButtonDisabled,
                ]}
                disabled={!data?.pagination?.hasPrevPage}
                onPress={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.pageButtonText}>Newer</Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                Page {data?.pagination?.page || 1} of{' '}
                {data?.pagination?.totalPages || 1}
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
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

function BookingCard({
  item,
  onCancel,
}: {
  item: BookingItem;
  onCancel: () => void;
}) {
  const isPending = item.status === 'PENDING';
  const isDelivered = item.status === 'DELIVERED';
  const isCommercial = item.cylinderType === 'COMMERCIAL';

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTopRow}>
        <View
          style={[
            styles.bookingIcon,
            {
              backgroundColor: isCommercial ? COLORS.greenSoft : COLORS.blueSoft,
            },
          ]}
        >
          <Ionicons
            name="cube-outline"
            size={24}
            color={isCommercial ? COLORS.green : COLORS.primary}
          />
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.bookingName} numberOfLines={1}>
            {item.customerName}
          </Text>

          <View style={styles.bookingAddressRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.bookingAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <Text style={styles.bookingProduct}>
            {isCommercial ? 'Commercial' : 'Domestic'} × {item.totalQty}
            {isDelivered && item.deliveredAt
              ? `  ◷ ${formatTime(item.deliveredAt)}`
              : ''}
          </Text>
        </View>

        <View style={styles.bookingRight}>
          <View
            style={[
              styles.bookingStatusBadge,
              isPending
                ? styles.pendingBadge
                : isDelivered
                ? styles.deliveredBadge
                : styles.cancelledBadge,
            ]}
          >
            <Text
              style={[
                styles.bookingStatusText,
                isPending
                  ? styles.pendingText
                  : isDelivered
                  ? styles.deliveredText
                  : styles.cancelledText,
              ]}
            >
              {getStatusLabel(item.status)}
            </Text>
          </View>

          <Text style={styles.bookingAmount}>
            ₹{item.totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>
      </View>

      {isPending ? (
        <TouchableOpacity style={styles.cancelBookingButton} onPress={onCancel}>
          <Text style={styles.cancelBookingText}>×  Cancel Booking</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function CancelBookingModal({
  visible,
  loading,
  onCancel,
  onKeep,
}: {
  visible: boolean;
  loading: boolean;
  onCancel: () => void;
  onKeep: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.cancelOverlay}>
        <View style={styles.cancelModalBox}>
          <Text style={styles.cancelTitle}>Cancel this booking?</Text>

          <Text style={styles.cancelDescription}>
            This action cannot be undone. The booking will be marked as
            cancelled.
          </Text>

          <TouchableOpacity
            style={styles.cancelConfirmButton}
            onPress={onCancel}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.cancelConfirmText}>Yes, Cancel</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.keepBookingButton}
            onPress={onKeep}
            disabled={loading}
          >
            <Text style={styles.keepBookingText}>Keep Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function PerformanceRow({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.performanceRowCard}>
      <View style={styles.performanceRowLeft}>
        <View style={[styles.performanceIconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>

        <Text style={styles.performanceRowLabel}>{label}</Text>
      </View>

      <Text style={[styles.performanceRowValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },

  roleSwitchWrap: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },

  roleButton: {
    flex: 1,
    height: 54,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.blueSoft,
  },

  roleButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  roleButtonTextActive: {
    color: COLORS.primary,
  },

  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  profileAvatar: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },

  profileInitials: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },

  profileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },

  profileMeta: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  performanceWrapVertical: {
    gap: 10,
    marginBottom: 24,
  },

  performanceRowCard: {
    height: 76,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  performanceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  performanceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  performanceRowLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  performanceRowValue: {
    fontSize: 26,
    fontWeight: '900',
  },

  myBookingsCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  myBookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },

  myBookingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  myBookingTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  myBookingSub: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  myBookingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  myBookingCount: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },

  dayCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
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
    gap: 8,
    flex: 1,
  },

  dayDateText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  dayRight: {
    alignItems: 'flex-end',
  },

  dayAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },

  dayDeliveries: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },

  deliveryRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
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
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  subMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },

  rowRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  amountText: {
    fontSize: 16,
    fontWeight: '900',
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
    fontWeight: '800',
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

  creditBadge: {
    backgroundColor: COLORS.orangeSoft,
  },

  creditText: {
    color: COLORS.orange,
  },

  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 12,
    marginTop: 4,
  },

  pageButton: {
    minWidth: 84,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  pageButtonDisabled: {
    opacity: 0.4,
  },

  pageButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  pageIndicator: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  bookingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 28,
  },

  backSquare: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },

  bookingPageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  bookingCount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  bookingCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },

  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bookingIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  bookingInfo: {
    flex: 1,
  },

  bookingName: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  bookingAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },

  bookingAddress: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  bookingProduct: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 12,
  },

  bookingRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  bookingStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 24,
  },

  bookingStatusText: {
    fontSize: 13,
    fontWeight: '900',
  },

  pendingBadge: {
    backgroundColor: COLORS.orangeSoft,
  },

  pendingText: {
    color: COLORS.orange,
  },

  deliveredBadge: {
    backgroundColor: COLORS.greenSoft,
  },

  deliveredText: {
    color: COLORS.green,
  },

  cancelledBadge: {
    backgroundColor: '#FEE2E2',
  },

  cancelledText: {
    color: '#EF4444',
  },

  bookingAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },

  cancelBookingButton: {
    height: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  cancelBookingText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EF4444',
  },

  cancelOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
  },

  cancelModalBox: {
    backgroundColor: COLORS.white,
    padding: 28,
  },

  cancelTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },

  cancelDescription: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 20,
    marginBottom: 28,
  },

  cancelConfirmButton: {
    height: 74,
    borderRadius: 16,
    backgroundColor: '#E05252',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  cancelConfirmText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
  },

  keepBookingButton: {
    height: 74,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  keepBookingText: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '900',
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingVertical: 30,
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
});