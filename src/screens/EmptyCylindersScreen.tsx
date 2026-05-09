import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
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
import { COLORS } from '../constants/colors';
import api from '../services/api';
import {
    EmptyCylindersHistoryResponse,
    EmptyCylindersTodayResponse,
} from '../types';

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

export default function EmptyCylindersScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');
  const [todayData, setTodayData] = useState<EmptyCylindersTodayResponse | null>(null);
  const [historyData, setHistoryData] = useState<EmptyCylindersHistoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTodayData = useCallback(async () => {
    const response = await api.get(`/drivers/${DRIVER_ID}/empty-cylinders/today`);
    if (response.data?.success) {
      setTodayData(response.data.data);
    } else {
      throw new Error('Failed to load empty cylinders today');
    }
  }, []);

  const fetchHistoryData = useCallback(async () => {
    const response = await api.get(`/drivers/${DRIVER_ID}/empty-cylinders/history`);
    if (response.data?.success) {
      setHistoryData(response.data.data);
    } else {
      throw new Error('Failed to load empty cylinders history');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');

        if (activeTab === 'today') {
          await fetchTodayData();
        } else {
          await fetchHistoryData();
        }
      } catch (err: any) {
        console.error('EmptyCylindersScreen error:', err?.response?.data || err.message);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeTab, fetchTodayData, fetchHistoryData]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);

      if (activeTab === 'today') {
        await fetchTodayData();
      } else {
        await fetchHistoryData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveToday = async () => {
    try {
      setSubmitting(true);

      const response = await api.put(
        `/drivers/${DRIVER_ID}/empty-cylinders/approve-today`
      );

      if (response.data?.success) {
        Alert.alert('Success', 'Empty cylinders returned to godown');
        await fetchTodayData();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to approve today requests');
      }
    } catch (err: any) {
      console.error('handleApproveToday error:', err?.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to approve today requests'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.pageTitle}>Empty Cylinders</Text>
        </View>

        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'today' && styles.segmentTabActive]}
            onPress={() => setActiveTab('today')}
          >
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.segmentText, activeTab === 'today' && styles.segmentTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'history' && styles.segmentTabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={[styles.segmentText, activeTab === 'history' && styles.segmentTextActive]}>
              History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : activeTab === 'today' ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.orange }]}>
                  {todayData?.summary?.collected ?? 0}
                </Text>
                <Text style={styles.statLabel}>Collected</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.green }]}>
                  {todayData?.summary?.returned ?? 0}
                </Text>
                <Text style={styles.statLabel}>Returned</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.red }]}>
                  {todayData?.summary?.inHand ?? 0}
                </Text>
                <Text style={styles.statLabel}>In Hand</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Collected From</Text>

            {todayData?.collectedFrom?.map((item) => (
              <View key={item.id} style={styles.infoCard}>
                <View>
                  <Text style={styles.infoTitle}>{item.customerName}</Text>
                  <Text style={styles.infoSub}>
                    {item.productType} · {formatTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.qtyOrange}>{item.quantity}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Return Requests</Text>

            {todayData?.returnRequests?.map((item) => (
              <View key={item.id} style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  <Ionicons
                    name={item.isApproved ? 'checkmark-circle-outline' : 'time-outline'}
                    size={18}
                    color={item.isApproved ? COLORS.green : COLORS.orange}
                    style={styles.requestIcon}
                  />
                  <View>
                    <Text style={styles.requestTitle}>{item.quantity} Cylinders</Text>
                    <Text style={styles.requestTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.badge,
                    item.isApproved ? styles.approvedBadge : styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.isApproved ? styles.approvedText : styles.pendingText,
                    ]}
                  >
                    {item.isApproved ? 'Approved' : 'Awaiting Approval'}
                  </Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.returnButton, submitting && styles.disabledButton]}
              onPress={handleApproveToday}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.white} />
                  <Text style={styles.returnButtonText}>Return Empties to Godown</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {historyData?.items?.map((item, index) => (
              <View key={`${item.date}-${index}`} style={styles.historyCard}>
                <View style={styles.historyLeft}>
                  <View style={styles.calendarWrap}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.orange} />
                  </View>
                  <View>
                    <Text style={styles.historyDate}>{formatDateLabel(item.date)}</Text>
                    <Text style={styles.historyMeta}>
                      Collected: <Text style={styles.orangeText}>{item.collected}</Text>{' '}
                      Returned: <Text style={styles.greenText}>{item.returned}</Text>
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </View>
            ))}
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

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F3',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  segmentTab: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  qtyOrange: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.orange,
  },

  requestCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIcon: {
    marginRight: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  requestTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  badge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  approvedBadge: {
    backgroundColor: COLORS.greenSoft,
  },
  pendingBadge: {
    backgroundColor: COLORS.orangeSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  approvedText: {
    color: COLORS.green,
  },
  pendingText: {
    color: COLORS.orange,
  },

  returnButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  returnButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.7,
  },

  historyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyDate: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  orangeText: {
    color: COLORS.orange,
    fontWeight: '700',
  },
  greenText: {
    color: COLORS.green,
    fontWeight: '700',
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
});