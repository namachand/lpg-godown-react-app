import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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

const DRIVER_ID = 2;

type RequestItem = {
  id: number;
  quantity: number;
  productName?: string;
  productType?: string;
  batchNo?: string;
  createdAt?: string;
  isApproved: number;
};

type InHandData = {
  summary: {
    allocated: number;
    delivered: number;
    returned?: number;
    defective?: number;
    inHand: number;
  };
  returnRequests: RequestItem[];
  defectiveRequests: RequestItem[];
};

const formatTime = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InHandCylindersScreen() {
  const router = useRouter();

  const [data, setData] = useState<InHandData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const pendingReturnRequests =
    data?.returnRequests?.filter((item) => Number(item.isApproved) === 0) || [];

  const pendingDefectiveRequests =
    data?.defectiveRequests?.filter((item) => Number(item.isApproved) === 0) ||
    [];

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
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

            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchInHandSummary}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard
                value={data?.summary?.allocated ?? 0}
                label="Allocated"
                color={COLORS.primary}
              />

              <StatCard
                value={data?.summary?.delivered ?? 0}
                label="Delivered"
                color={COLORS.green}
              />

              <StatCard
                value={data?.summary?.inHand ?? 0}
                label="In Hand"
                color={COLORS.orange}
              />
            </View>

            <Text style={styles.sectionTitle}>Return Requests</Text>

            {pendingReturnRequests.length > 0 ? (
              pendingReturnRequests.map((item) => (
                <RequestCard
                  key={`return-${item.id}`}
                  quantity={item.quantity}
                  productName={item.productName}
                  productType={item.productType}
                  batchNo={item.batchNo}
                  time={formatTime(item.createdAt)}
                  type="return"
                />
              ))
            ) : (
              <View style={styles.emptyBoxSmall}>
                <Text style={styles.emptyText}>No pending return requests</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Defective Cylinder Requests</Text>

            {pendingDefectiveRequests.length > 0 ? (
              pendingDefectiveRequests.map((item) => (
                <RequestCard
                  key={`defective-${item.id}`}
                  quantity={item.quantity}
                  productName={item.productName}
                  productType={item.productType}
                  batchNo={item.batchNo}
                  time={formatTime(item.createdAt)}
                  type="defective"
                />
              ))
            ) : (
              <View style={styles.emptyBoxSmall}>
                <Text style={styles.emptyText}>
                  No pending defective requests
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function RequestCard({
  quantity,
  productName,
  productType,
  batchNo,
  time,
  type,
}: {
  quantity: number;
  productName?: string;
  productType?: string;
  batchNo?: string;
  time: string;
  type: 'return' | 'defective';
}) {
  const isDefective = type === 'defective';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestLeft}>
        <View
          style={isDefective ? styles.requestIconRed : styles.requestIconOrange}
        >
          <Ionicons
            name={isDefective ? 'warning-outline' : 'time-outline'}
            size={18}
            color={isDefective ? '#EF4444' : COLORS.orange}
          />
        </View>

        <View style={styles.requestTextBox}>
          <Text style={styles.requestTitle}>
            {quantity} {isDefective ? 'Defective ' : ''}
            {quantity === 1 ? 'Cylinder' : 'Cylinders'}
          </Text>

          {!!productName && (
            <Text style={styles.requestProduct} numberOfLines={1}>
              {productName}
            </Text>
          )}

          <View style={styles.metaRow}>
            {!!batchNo && (
              <Text style={styles.batchPill}>{batchNo}</Text>
            )}

            {!!productType && (
              <Text style={styles.typePill}>{productType}</Text>
            )}
          </View>

          <Text style={styles.requestTime}>{time}</Text>
        </View>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>Awaiting Approval</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    marginRight: 16,
    padding: 2,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 18,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },

  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 4,
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
    flex: 1,
  },

  requestIconOrange: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  requestIconRed: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  requestTextBox: {
    flex: 1,
  },

  requestTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  requestProduct: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },

  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },

  batchPill: {
    backgroundColor: COLORS.blueSoft,
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  typePill: {
    backgroundColor: '#F1F5F9',
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  requestTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  badge: {
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },

  badgeText: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '800',
  },

  emptyBoxSmall: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 18,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
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
    color: '#DC2626',
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
    fontWeight: '700',
  },
});