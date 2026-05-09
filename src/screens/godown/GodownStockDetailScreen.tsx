import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import { getGodownDashboardData } from '../../services/godownService';

export default function GodownStockDetailScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await getGodownDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.log('Godown stock detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getDetailData = () => {
    if (!dashboardData) return null;

    if (type === 'domestic') {
      return {
        title: 'Domestic Available',
        icon: 'cube-outline',
        color: COLORS.primary,
        bg: COLORS.blueSoft,
        ...dashboardData.available.domestic,
      };
    }

    if (type === 'commercial') {
      return {
        title: 'Commercial Available',
        icon: 'cube-outline',
        color: COLORS.green,
        bg: COLORS.greenSoft,
        ...dashboardData.available.commercial,
      };
    }

    if (type === 'empty-domestic') {
      return {
        title: 'Domestic Empty',
        icon: 'refresh-outline',
        color: COLORS.orange,
        bg: COLORS.orangeSoft,
        ...dashboardData.empty.domestic,
      };
    }

    if (type === 'empty-commercial') {
      return {
        title: 'Commercial Empty',
        icon: 'refresh-outline',
        color: COLORS.orange,
        bg: COLORS.orangeSoft,
        ...dashboardData.empty.commercial,
      };
    }

    return null;
  };

  const data = getDetailData();

  if (loading) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.loaderBox}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!data) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.content}>
          <Text>No data found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const diff = Number(data.total || 0) - Number(data.system || 0);

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.pageTitle}>{data.title}</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={[styles.iconBox, { backgroundColor: data.bg }]}>
              <Ionicons name={data.icon as any} size={26} color={data.color} />
            </View>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>TOTAL STOCK</Text>
              <Text style={styles.totalValue}>{data.total}</Text>
            </View>

            <View style={styles.diffBadge}>
              <Ionicons name="warning-outline" size={13} color="#EF4444" />
              <Text style={styles.diffBadgeText}>
                {diff > 0 ? `+${diff}` : diff}
              </Text>
            </View>
          </View>

          <View style={styles.smallCardRow}>
            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>PHYSICAL</Text>
              <Text style={styles.smallValue}>{data.total}</Text>
            </View>

            <View style={styles.smallCard}>
              <Text style={styles.smallLabel}>SYSTEM</Text>
              <Text style={styles.smallValue}>{data.system}</Text>
            </View>
          </View>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Item-wise Breakdown</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.4, textAlign: 'left' }]}>
              ITEM
            </Text>
            <Text style={styles.th}>PHYSICAL</Text>
            <Text style={styles.th}>SYSTEM</Text>
            <Text style={styles.th}>DIFF</Text>
          </View>

          {(data.items || []).map((item: any, index: number) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tdItem, { flex: 1.4 }]}>
                {item.item}
              </Text>

              <Text style={[styles.td, item.diff !== 0 && styles.redText]}>
                {item.physical}
              </Text>

              <Text style={styles.td}>{item.system}</Text>

              <Text style={[styles.td, item.diff !== 0 && styles.redText]}>
                {item.diff > 0 ? `+${item.diff}` : item.diff}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loaderBox: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginLeft: 18,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalBox: {
    marginLeft: 14,
    flex: 1,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  totalValue: {
    fontSize: 31,
    fontWeight: '900',
    color: COLORS.textPrimary,
    lineHeight: 35,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diffBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EF4444',
    marginLeft: 3,
  },
  smallCardRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  smallCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  smallValue: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
  breakdownCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    padding: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  th: {
    flex: 1,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tdItem: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  td: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  redText: {
    color: '#EF4444',
  },
});