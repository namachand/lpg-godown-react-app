import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import api from '../../services/api';

type StockItem = {
  productId: number;
  productName: string;
  quantity: number;
  emptyQuantity?: number;
  defectiveQuantity?: number;
};

type StockDetailData = {
  type: 'domestic' | 'commercial';
  title: string;
  totalAvailable: number;
  totalEmpty: number;
  totalDefective: number;
  items: StockItem[];
};

export default function GodownStockDetailScreen() {
  const params = useLocalSearchParams();
  const type = String(params.type || 'domestic').toLowerCase();

  const [data, setData] = useState<StockDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isCommercial = type === 'commercial';

  const title = useMemo(() => {
    return isCommercial ? 'Commercial Stock' : 'Domestic Stock';
  }, [isCommercial]);

  const fetchStockDetail = async () => {
    try {
      const response = await api.get(`/godown/stock-detail/${type}`);

      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (error: any) {
      console.log(
        'fetchStockDetail error:',
        error?.response?.data || error.message
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStockDetail();
  }, [type]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStockDetail();
  };

  if (loading) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Loading stock details...</Text>
        </View>
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>
              {data?.totalAvailable || 0} cylinders available
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryBox
            label="Available"
            value={data?.totalAvailable || 0}
            icon="cube-outline"
            color={COLORS.primary}
            bg={COLORS.blueSoft}
          />

          <SummaryBox
            label="Empties"
            value={data?.totalEmpty || 0}
            icon="refresh-outline"
            color={COLORS.orange}
            bg={COLORS.orangeSoft}
          />

          <SummaryBox
            label="Defective"
            value={data?.totalDefective || 0}
            icon="warning-outline"
            color="#EF4444"
            bg="#FEE2E2"
          />
        </View>

        {isCommercial ? (
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.bookingCard}
            onPress={() => router.push('/commercial-bookings')}
          >
            <View style={styles.bookingLeft}>
              <View style={styles.bookingIconBox}>
                <Ionicons name="clipboard-outline" size={28} color={COLORS.primary} />
              </View>

              <View style={styles.bookingTextBox}>
                <Text style={styles.bookingTitle}>Delivery Boy Bookings</Text>
                <Text style={styles.bookingSub}>
                  Approve commercial cylinder bookings
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={26}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>ITEM BREAKDOWN</Text>

        <View style={styles.breakdownCard}>
          {(data?.items || []).length ? (
            data?.items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="cube-outline" size={22} color={COLORS.primary} />
                  </View>

                  <View>
                    <Text style={styles.itemName}>{item.productName}</Text>
                    <Text style={styles.itemSub}>
                      Empty: {item.emptyQuantity || 0} · Defective:{' '}
                      {item.defectiveQuantity || 0}
                    </Text>
                  </View>
                </View>

                <Text style={styles.itemQty}>{item.quantity || 0}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No stock items found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SummaryBox({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: any;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.summaryBox}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>

      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loaderText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },

  backButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  subtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },

  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  bookingCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  bookingIconBox: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  bookingTextBox: {
    flex: 1,
  },

  bookingTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  bookingSub: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },

  breakdownCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    overflow: 'hidden',
  },

  itemRow: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  itemIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  itemName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  itemSub: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  itemQty: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});