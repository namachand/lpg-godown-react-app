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
import { InHandSummaryResponse } from '../types';

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

export default function InHandCylindersScreen() {
  const router = useRouter();
  const [data, setData] = useState<InHandSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInHandSummary = useCallback(async () => {
    try {
      setError('');
      const response = await api.get(`/drivers/${DRIVER_ID}/in-hand-summary`);

      if (response.data?.success) {
        setData(response.data.data);
      } else {
        setError('Failed to load in-hand summary');
      }
    } catch (err: any) {
      console.error(
        'fetchInHandSummary error:',
        err?.response?.data || err.message
      );
      setError('Failed to load in-hand summary');
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchInHandSummary();
      setLoading(false);
    };

    load();
  }, [fetchInHandSummary]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInHandSummary();
    setRefreshing(false);
  };

  const handleReturnToGodown = async () => {
    try {
      setSubmitting(true);

      const response = await api.put(`/drivers/${DRIVER_ID}/return-in-hand`);

      if (response.data?.success) {
        Alert.alert('Success', 'In-hand cylinders returned to godown');
        await fetchInHandSummary();
      } else {
        Alert.alert(
          'Error',
          response.data?.message || 'Failed to return cylinders'
        );
      }
    } catch (err: any) {
      console.error(
        'handleReturnToGodown error:',
        err?.response?.data || err.message
      );
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to return cylinders'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const firstRequest = data?.returnRequests?.[0];

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
          <Text style={styles.pageTitle}>In-Hand Cylinders</Text>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading in-hand summary...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchInHandSummary}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.primary }]}>
                  {data?.summary?.allocated ?? 0}
                </Text>
                <Text style={styles.statLabel}>Allocated</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.green }]}>
                  {data?.summary?.delivered ?? 0}
                </Text>
                <Text style={styles.statLabel}>Delivered</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.orange }]}>
                  {data?.summary?.inHand ?? 0}
                </Text>
                <Text style={styles.statLabel}>In Hand</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Return Requests</Text>

            {firstRequest ? (
              <View style={styles.requestCard}>
                <View style={styles.requestLeft}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.orange}
                    style={styles.requestIcon}
                  />
                  <View>
                    <Text style={styles.requestTitle}>
                      {firstRequest.quantity} Cylinders
                    </Text>
                    <Text style={styles.requestTime}>
                      {formatTime(firstRequest.createdAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Awaiting Approval</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.infoText}>No pending return requests</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.returnButton, submitting && styles.disabledButton]}
              onPress={handleReturnToGodown}
              disabled={submitting || !firstRequest}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="cube-outline" size={20} color={COLORS.white} />
                  <Text style={styles.returnButtonText}>Return In-Hand to Godown</Text>
                </>
              )}
            </TouchableOpacity>
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
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
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
  },
  requestCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  badgeText: {
    color: COLORS.orange,
    fontSize: 12,
    fontWeight: '700',
  },
  returnButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  returnButtonText: {
    color: COLORS.white,
    fontSize: 18,
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
    marginBottom: 14,
  },
});