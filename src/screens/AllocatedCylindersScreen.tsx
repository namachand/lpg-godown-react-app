import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
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

type AllocatedCylinderItem = {
  productId: number;
  productName: string;
  productType: 'DOMESTIC' | 'COMMERCIAL';
  size?: string;
  totalAllocated: number;
  delivered: number;
  pending: number;
  lastAllocatedAt: string;
  latestSaleId: number;
};

type AllocatedResponse = {
  summary: {
    totalAllocated: number;
    delivered: number;
    pending: number;
  };
  items: AllocatedCylinderItem[];
};

const formatProductType = (type: string) => {
  if (type === 'DOMESTIC') return 'Domestic';
  if (type === 'COMMERCIAL') return 'Commercial';
  return type;
};

const getProductSize = (item: AllocatedCylinderItem) => {
  if (item.size) return item.size;

  const match = item.productName?.match(/\d+\.?\d*\s?kg/i);
  if (match?.[0]) return match[0].replace(/\s/g, ' ');

  return '';
};

const formatDate = (date?: string) => {
  if (!date) return '-';

  const d = new Date(date);

  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const getProgressWidth = (item: AllocatedCylinderItem): DimensionValue => {
  if (!item.totalAllocated) return '0%';

  const width = Math.min(
    100,
    Math.round((item.delivered / item.totalAllocated) * 100)
  );

  return `${width}%` as DimensionValue;
};

export default function AllocatedCylindersScreen() {
  const router = useRouter();

  const [data, setData] = useState<AllocatedResponse>({
    summary: {
      totalAllocated: 0,
      delivered: 0,
      pending: 0,
    },
    items: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchAllocatedCylinders = useCallback(async () => {
    try {
      setError('');

      const response = await api.get(
        `/drivers/${DRIVER_ID}/allocated-cylinders`
      );

      if (response.data?.success) {
        setData({
          summary: response.data.data?.summary || {
            totalAllocated: 0,
            delivered: 0,
            pending: 0,
          },
          items: response.data.data?.items || [],
        });
      } else {
        setError('Failed to load allocated cylinders');
      }
    } catch (err: any) {
      console.error(
        'fetchAllocatedCylinders error:',
        err?.response?.data || err.message
      );
      setError('Failed to load allocated cylinders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllocatedCylinders();
  }, [fetchAllocatedCylinders]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllocatedCylinders();
  };

  const headerSubText = useMemo(() => {
    return `${data.summary.totalAllocated} units · ${data.summary.delivered} delivered · ${data.summary.pending} pending`;
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
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.8}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={30} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleTextWrap}>
            <Text style={styles.pageTitle}>Allocated Cylinders</Text>
            <Text style={styles.pageSubTitle}>{headerSubText}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.infoText}>Loading allocated cylinders...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchAllocatedCylinders}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : data.items.length ? (
          data.items.map((item) => (
            <TouchableOpacity
              key={item.productId}
              activeOpacity={0.9}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.productIconBox}>
                  <Ionicons
                    name="cube-outline"
                    size={42}
                    color={COLORS.primary}
                  />
                </View>

                <View style={styles.productInfo}>
                  <View style={styles.productTitleRow}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.productName || 'LPG Cylinder'}
                    </Text>

                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>
                        {formatProductType(item.productType)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.productSize}>{getProductSize(item)}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      # B-{item.latestSaleId || item.productId}
                    </Text>

                    <Ionicons
                      name="calendar-outline"
                      size={17}
                      color={COLORS.textSecondary}
                    />

                    <Text style={styles.metaText}>
                      {formatDate(item.lastAllocatedAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.rightBox}>
                  <Text style={styles.unitsValue}>{item.totalAllocated}</Text>
                  <Text style={styles.unitsLabel}>units</Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={28}
                  color={COLORS.textSecondary}
                />
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: getProgressWidth(item),
                    },
                  ]}
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Ionicons
                    name="cube-outline"
                    size={22}
                    color={COLORS.primary}
                  />

                  <View>
                    <Text style={styles.statLabel}>TOTAL</Text>
                    <Text style={styles.statValueBlue}>
                      {item.totalAllocated}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statBox, styles.deliveredBox]}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={COLORS.green}
                  />

                  <View>
                    <Text style={styles.statLabel}>DELIVERED</Text>
                    <Text style={styles.statValueGreen}>{item.delivered}</Text>
                  </View>
                </View>

                <View style={[styles.statBox, styles.pendingBox]}>
                  <Ionicons name="time-outline" size={22} color={COLORS.orange} />

                  <View>
                    <Text style={styles.statLabel}>PENDING</Text>
                    <Text style={styles.statValueOrange}>{item.pending}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.infoText}>No allocated cylinders found</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 110,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
  },

  titleTextWrap: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  pageSubTitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  productIconBox: {
    width: 58,
    height: 58,
    borderRadius: 15,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  productInfo: {
    flex: 1,
    minWidth: 0,
  },

  productTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  productName: {
    maxWidth: 150,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginRight: 6,
  },

  typeBadge: {
    backgroundColor: '#F1F2F4',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
  },

  typeBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  productSize: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  metaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },

  metaText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: 6,
  },

  rightBox: {
    width: 46,
    alignItems: 'center',
    marginLeft: 6,
  },

  unitsValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  unitsLabel: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F0F1F3',
    overflow: 'hidden',
    marginTop: 16,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: COLORS.green,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },

  statBox: {
    flex: 1,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#FBFBFC',
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  deliveredBox: {
    backgroundColor: COLORS.greenSoft,
  },

  pendingBox: {
    backgroundColor: COLORS.orangeSoft,
  },

  statLabel: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  statValueBlue: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },

  statValueGreen: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    color: COLORS.green,
  },

  statValueOrange: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '900',
    color: COLORS.orange,
  },

  centerBox: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 13,
  },

  errorText: {
    color: '#dc2626',
    fontSize: 13,
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