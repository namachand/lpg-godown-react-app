import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  approveReturnByCondition,
  getReturnsToday,
} from '../../services/godownService';

export default function GodownReturnsTodayScreen() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const data = await getReturnsToday();
      setReturns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Returns today error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReturns();
    }, [])
  );

  const handleApprove = async (
    driverId: number,
    condition: 'empty' | 'normal' | 'defective'
  ) => {
    try {
      setApprovingKey(`${driverId}-${condition}`);

      await approveReturnByCondition({
        driver_id: driverId,
        condition,
      });

      await fetchReturns();
      setOpenKey(null);
    } catch (error) {
      console.log('Approve return error:', error);
    } finally {
      setApprovingKey(null);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.pageHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Returns Today</Text>
          <Text style={styles.subtitle}>
            {returns.filter((x) => x.total > 0).length} drivers returned cylinders
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderBox}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {returns.map((driver) => (
            <View key={driver.driver_id} style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.avatar}>
                  <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.driverName}>{driver.driver_name}</Text>
                  <Text style={styles.driverTime}>
                    Today, {formatTime(driver.time)}
                  </Text>
                </View>

                <View style={styles.totalBox}>
                  <Text style={styles.totalValue}>{driver.total}</Text>
                  <Text style={styles.totalLabel}>TOTAL</Text>
                </View>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeadText, { flex: 1.6 }]}>ITEM</Text>
                <Text style={styles.emptyHead}>EMPTY</Text>
                <Text style={styles.normalHead}>NORMAL</Text>
                <Text style={styles.defHead}>DEF.</Text>
              </View>

              {groupItems(driver.items).map((item: any) => (
                <View key={item.name} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />

                    <View>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemSub}>{item.category}</Text>
                    </View>
                  </View>

                  <Text style={styles.emptyValue}>{item.empty}</Text>
                  <Text style={styles.normalValue}>{item.normal}</Text>
                  <Text style={styles.defValue}>{item.defective}</Text>
                </View>
              ))}

              <Text style={styles.approveLabel}>APPROVE BY CONDITION</Text>

              <ApproveBox
                title="Empty Cylinders"
                count={driver.empty}
                condition="empty"
                color={COLORS.orange}
                bg={COLORS.orangeSoft}
                open={openKey === `${driver.driver_id}-empty`}
                loading={approvingKey === `${driver.driver_id}-empty`}
                onToggle={() =>
                  setOpenKey(
                    openKey === `${driver.driver_id}-empty`
                      ? null
                      : `${driver.driver_id}-empty`
                  )
                }
                onApprove={() => handleApprove(driver.driver_id, 'empty')}
              />

              <ApproveBox
                title="Normal Cylinder"
                count={driver.normal}
                condition="normal"
                color={COLORS.primary}
                bg={COLORS.blueSoft}
                open={openKey === `${driver.driver_id}-normal`}
                loading={approvingKey === `${driver.driver_id}-normal`}
                onToggle={() =>
                  setOpenKey(
                    openKey === `${driver.driver_id}-normal`
                      ? null
                      : `${driver.driver_id}-normal`
                  )
                }
                onApprove={() => handleApprove(driver.driver_id, 'normal')}
              />

              <ApproveBox
                title="Defective Cylinder"
                count={driver.defective}
                condition="defective"
                color="#EF4444"
                bg="#FEE2E2"
                open={openKey === `${driver.driver_id}-defective`}
                loading={approvingKey === `${driver.driver_id}-defective`}
                onToggle={() =>
                  setOpenKey(
                    openKey === `${driver.driver_id}-defective`
                      ? null
                      : `${driver.driver_id}-defective`
                  )
                }
                onApprove={() => handleApprove(driver.driver_id, 'defective')}
              />
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

function ApproveBox({
  title,
  count,
  condition,
  color,
  bg,
  open,
  loading,
  onToggle,
  onApprove,
}: any) {
  return (
    <View
      style={[
        styles.approveBox,
        {
          borderColor: color,
          backgroundColor: open ? bg : COLORS.white,
        },
      ]}
    >
      <TouchableOpacity style={styles.approveTop} onPress={onToggle}>
        <View style={[styles.conditionIcon, { backgroundColor: bg }]}>
          <Ionicons
            name={
              condition === 'empty'
                ? 'refresh-outline'
                : condition === 'normal'
                ? 'cube-outline'
                : 'warning-outline'
            }
            size={22}
            color={color}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.conditionTitle}>{title}</Text>
          <Text style={styles.conditionSub}>{count} to approve</Text>
        </View>

        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      {open && (
        <>
          <View style={styles.approveInnerRow}>
            <Text style={styles.innerText}>{title}</Text>
            <Text style={[styles.innerValue, { color }]}>{count}</Text>
          </View>

          <TouchableOpacity
            style={styles.approveButton}
            onPress={onApprove}
            disabled={loading || count <= 0}
          >
            <Text style={styles.approveButtonText}>
              {loading
                ? 'Approving...'
                : `Approve ${count} ${condition}`}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const groupItems = (items: any[]) => {
  const map: any = {};

  items.forEach((item) => {
    if (!map[item.name]) {
      map[item.name] = {
        name: item.name,
        category: item.category,
        empty: 0,
        normal: 0,
        defective: 0,
      };
    }

    map[item.name][item.condition] += Number(item.quantity || 0);
  });

  return Object.values(map);
};

const formatTime = (date?: string | null) => {
  if (!date) return '--';

  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const styles = StyleSheet.create({
  pageHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  loaderBox: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  driverTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  totalBox: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeadText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  emptyHead: {
    width: 50,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.orange,
    textAlign: 'center',
  },
  normalHead: {
    width: 55,
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
  },
  defHead: {
    width: 42,
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    textAlign: 'center',
  },
  itemRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemLeft: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  itemSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  emptyValue: {
    width: 50,
    textAlign: 'center',
    color: COLORS.orange,
    fontWeight: '900',
  },
  normalValue: {
    width: 55,
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '900',
  },
  defValue: {
    width: 42,
    textAlign: 'center',
    color: '#EF4444',
    fontWeight: '900',
  },
  approveLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginTop: 14,
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  approveBox: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  approveTop: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  conditionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conditionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  conditionSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  approveInnerRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  innerText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  innerValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  approveButton: {
    marginHorizontal: 12,
    marginBottom: 12,
    height: 44,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
});