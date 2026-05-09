import { Ionicons } from '@expo/vector-icons';
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
import CashDenominationModal from '../components/ui/CashDenominationModal';
import SummaryCard from '../components/ui/SummaryCard';
import { COLORS } from '../constants/colors';
import api from '../services/api';
import {
  CollectionHistoryResponse,
  CollectionSummaryResponse
} from '../types';

const DRIVER_ID = 2;

const formatTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
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

export default function CollectionScreen() {
  const [activeTab, setActiveTab] = useState<'summary' | 'history'>('summary');

  const [summaryData, setSummaryData] = useState<CollectionSummaryResponse | null>(null);
  const [historyData, setHistoryData] = useState<CollectionHistoryResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [settlingMethod, setSettlingMethod] = useState<'UPI' | 'TOTAL_UPI' | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [cashSubmitting, setCashSubmitting] = useState(false);

  const fetchCollectionSummary = useCallback(async () => {
    const response = await api.get(`/drivers/${DRIVER_ID}/collection-summary`);
    if (response.data?.success) {
      setSummaryData(response.data.data);
    } else {
      throw new Error('Failed to load collection summary');
    }
  }, []);

  const fetchCollectionHistory = useCallback(async (page = 1) => {
    const response = await api.get(
      `/drivers/${DRIVER_ID}/collection-history?page=${page}&limit=2`
    );
    if (response.data?.success) {
      setHistoryData(response.data.data);
    } else {
      throw new Error('Failed to load collection history');
    }
  }, []);

  const loadScreen = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      if (activeTab === 'summary') {
        await fetchCollectionSummary();
      } else {
        await fetchCollectionHistory(historyPage);
      }
    } catch (err: any) {
      console.error('Collection screen load error:', err?.response?.data || err.message);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, fetchCollectionHistory, fetchCollectionSummary, historyPage]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      if (activeTab === 'summary') {
        await fetchCollectionSummary();
      } else {
        await fetchCollectionHistory(historyPage);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSettleUpi = async () => {
    try {
      setSettlingMethod('UPI');

      const response = await api.put(`/drivers/${DRIVER_ID}/settle-collections`, {
        method: 'UPI',
      });

      if (response.data?.success) {
        Alert.alert('Success', 'UPI settlements settled successfully');
        await fetchCollectionSummary();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to settle collections');
      }
    } catch (err: any) {
      console.error('handleSettleUpi error:', err?.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to settle collections'
      );
    } finally {
      setSettlingMethod(null);
    }
  };

  const handleSettleTotalUpi = async () => {
    try {
      setSettlingMethod('TOTAL_UPI');

      const response = await api.put(`/drivers/${DRIVER_ID}/settle-collections`, {
        method: 'TOTAL_UPI',
      });

      if (response.data?.success) {
        Alert.alert('Success', 'Total collection settled successfully in UPI mode');
        await fetchCollectionSummary();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to settle total collection');
      }
    } catch (err: any) {
      console.error('handleSettleTotalUpi error:', err?.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to settle total collection'
      );
    } finally {
      setSettlingMethod(null);
    }
  };

  const handleSubmitCashDenominations = async ({
    denominations,
    enteredAmount,
  }: {
    denominations: {
      "500": number;
      "100": number;
      "50": number;
      "20": number;
      "10": number;
      coins: number;
    };
    enteredAmount: number;
  }) => {
    try {
      const expectedAmount = summaryData?.summary?.cashCollected ?? 0;

      if (enteredAmount !== expectedAmount) {
        Alert.alert(
          'Amount mismatch',
          `Entered ₹${enteredAmount} should match expected ₹${expectedAmount}`
        );
        return;
      }

      setCashSubmitting(true);

      const response = await api.put(`/drivers/${DRIVER_ID}/settle-collections`, {
        method: 'CASH',
        denominations,
      });

      if (response.data?.success) {
        setCashModalVisible(false);
        Alert.alert('Success', 'Cash settlements settled successfully');
        await fetchCollectionSummary();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to settle cash');
      }
    } catch (err: any) {
      console.error(
        'handleSubmitCashDenominations error:',
        err?.response?.data || err.message
      );
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to settle cash'
      );
    } finally {
      setCashSubmitting(false);
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
        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'summary' && styles.segmentTabActive]}
            onPress={() => setActiveTab('summary')}
          >
            <Ionicons
              name="card-outline"
              size={14}
              color={activeTab === 'summary' ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'summary' && styles.segmentTextActive,
              ]}
            >
              Collection Summary
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'history' && styles.segmentTabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeTab === 'history' ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'history' && styles.segmentTextActive,
              ]}
            >
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
        ) : activeTab === 'summary' ? (
          <>
            <View style={styles.topCards}>
              <View style={styles.miniCard}>
                <View style={[styles.iconWrap, { backgroundColor: COLORS.greenSoft }]}>
                  <Ionicons name="wallet-outline" size={18} color={COLORS.green} />
                </View>
                <Text style={styles.miniValue}>
                  ₹{summaryData?.summary?.cashCollected ?? 0}
                </Text>
                <Text style={styles.miniLabel}>Cash Collected</Text>
              </View>

              <View style={styles.miniCard}>
                <View style={[styles.iconWrap, { backgroundColor: COLORS.blueSoft }]}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.miniValue}>
                  ₹{summaryData?.summary?.upiCollected ?? 0}
                </Text>
                <Text style={styles.miniLabel}>UPI Payments</Text>
              </View>
            </View>

            {summaryData?.settlements?.cash?.map((item) => (
              <SummaryCard
                key={`cash-${item.id}`}
                icon="wallet-outline"
                iconBg={COLORS.greenSoft}
                iconColor={COLORS.green}
                title="Cash Collection"
                amount={`₹${item.amount ?? 0}`}
                customer={item.customerName}
                time={formatTime(item.createdAt)}
                buttonText="Settle Cash Collection"
                buttonColor={COLORS.buttonGreen}
                onPress={() => setCashModalVisible(true)}
                loading={false}
              />
            ))}

            {summaryData?.settlements?.upi?.map((item) => (
              <SummaryCard
                key={`upi-${item.id}`}
                icon="phone-portrait-outline"
                iconBg={COLORS.blueSoft}
                iconColor={COLORS.primary}
                title="UPI Payments"
                amount={`₹${item.amount ?? 0}`}
                customer={item.customerName}
                time={formatTime(item.createdAt)}
                buttonText="Settle UPI Payments"
                buttonColor={COLORS.primary}
                onPress={handleSettleUpi}
                loading={settlingMethod === 'UPI'}
              />
            ))}

            <View style={styles.totalCard}>
              <View style={styles.totalHeaderRow}>
                <View style={[styles.iconWrap, { backgroundColor: COLORS.blueSoft }]}>
                  <Ionicons name="card-outline" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.totalTitle}>Total Collection</Text>
                  <Text style={styles.totalValue}>
                    ₹{summaryData?.summary?.totalCollected ?? 0}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.totalButton,
                  settlingMethod === 'TOTAL_UPI' && styles.totalButtonDisabled,
                ]}
                onPress={handleSettleTotalUpi}
                disabled={settlingMethod === 'TOTAL_UPI'}
              >
                {settlingMethod === 'TOTAL_UPI' ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={16} color={COLORS.white} />
                    <Text style={styles.totalButtonText}>
                      Settle Total — Online Payment
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {historyData?.items?.map((dayItem, index) => (
              <View key={`${dayItem.date}-${index}`} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <View style={styles.historyDateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.historyDateText}>
                      {index === 0 && historyPage === 1
                        ? `Today — ${formatDateLabel(dayItem.date)}`
                        : formatDateLabel(dayItem.date)}
                    </Text>
                  </View>
                  <Text style={styles.historyTotal}>₹{dayItem.totalAmount}</Text>
                </View>

                <View style={styles.badgeSummaryRow}>
                  <View
                    style={[
                      styles.methodSummaryBadge,
                      dayItem.summary.cash.status === 'SETTLED'
                        ? styles.settledBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <View style={styles.badgeInnerRow}>
                      <Ionicons
                        name={
                          dayItem.summary.cash.status === 'SETTLED'
                            ? 'checkmark-circle-outline'
                            : 'time-outline'
                        }
                        size={14}
                        color={
                          dayItem.summary.cash.status === 'SETTLED'
                            ? COLORS.green
                            : COLORS.orange
                        }
                      />
                      <View>
                        <Text
                          style={[
                            styles.methodSummaryText,
                            {
                              color:
                                dayItem.summary.cash.status === 'SETTLED'
                                  ? COLORS.green
                                  : COLORS.orange,
                            },
                          ]}
                        >
                          Cash: ₹{dayItem.summary.cash.amount}
                        </Text>
                        <Text
                          style={[
                            styles.methodSummarySubText,
                            {
                              color:
                                dayItem.summary.cash.status === 'SETTLED'
                                  ? COLORS.green
                                  : COLORS.orange,
                            },
                          ]}
                        >
                          {dayItem.summary.cash.status === 'SETTLED'
                            ? `Settled at ${formatTime(dayItem.summary.cash.settledAt || '')}`
                            : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.methodSummaryBadge,
                      dayItem.summary.upi.status === 'SETTLED'
                        ? styles.settledBadge
                        : styles.pendingBadge,
                    ]}
                  >
                    <View style={styles.badgeInnerRow}>
                      <Ionicons
                        name={
                          dayItem.summary.upi.status === 'SETTLED'
                            ? 'checkmark-circle-outline'
                            : 'time-outline'
                        }
                        size={14}
                        color={
                          dayItem.summary.upi.status === 'SETTLED'
                            ? COLORS.green
                            : COLORS.orange
                        }
                      />
                      <View>
                        <Text
                          style={[
                            styles.methodSummaryText,
                            {
                              color:
                                dayItem.summary.upi.status === 'SETTLED'
                                  ? COLORS.green
                                  : COLORS.orange,
                            },
                          ]}
                        >
                          UPI: ₹{dayItem.summary.upi.amount}
                        </Text>
                        <Text
                          style={[
                            styles.methodSummarySubText,
                            {
                              color:
                                dayItem.summary.upi.status === 'SETTLED'
                                  ? COLORS.green
                                  : COLORS.orange,
                            },
                          ]}
                        >
                          {dayItem.summary.upi.status === 'SETTLED'
                            ? `Settled at ${formatTime(dayItem.summary.upi.settledAt || '')}`
                            : 'Pending'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {dayItem.transactions.map((txn) => (
                  <View key={txn.saleId} style={styles.transactionRow}>
                    <View style={styles.transactionLeft}>
                      <View
                        style={[
                          styles.transactionIconWrap,
                          {
                            backgroundColor:
                              txn.paymentMode === 'CASH'
                                ? COLORS.greenSoft
                                : txn.paymentMode === 'UPI'
                                  ? COLORS.blueSoft
                                  : COLORS.orangeSoft,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            txn.paymentMode === 'CASH'
                              ? 'wallet-outline'
                              : txn.paymentMode === 'UPI'
                                ? 'phone-portrait-outline'
                                : 'card-outline'
                          }
                          size={16}
                          color={
                            txn.paymentMode === 'CASH'
                              ? COLORS.green
                              : txn.paymentMode === 'UPI'
                                ? COLORS.primary
                                : COLORS.orange
                          }
                        />
                      </View>

                      <View>
                        <Text style={styles.transactionName}>{txn.customerName}</Text>
                        <Text style={styles.transactionMeta}>
                          {formatTime(txn.deliveredAt)} ·{' '}
                          {txn.paymentMode === 'CARD' ? 'Online' : txn.paymentMode}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>₹{txn.amount}</Text>
                      <Text style={styles.paidText}>Paid</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.paginationWrap}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !historyData?.pagination?.hasPrevPage && styles.pageButtonDisabled,
                ]}
                disabled={!historyData?.pagination?.hasPrevPage}
                onPress={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
              >
                <Ionicons name="chevron-back" size={16} color={COLORS.textSecondary} />
                <Text style={styles.pageButtonText}>Newer</Text>
              </TouchableOpacity>

              <Text style={styles.pageIndicator}>
                Page {historyData?.pagination?.page || 1} of{' '}
                {historyData?.pagination?.totalPages || 1}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  !historyData?.pagination?.hasNextPage && styles.pageButtonDisabled,
                ]}
                disabled={!historyData?.pagination?.hasNextPage}
                onPress={() => setHistoryPage((prev) => prev + 1)}
              >
                <Text style={styles.pageButtonText}>Older</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <CashDenominationModal
        visible={cashModalVisible}
        expectedAmount={summaryData?.summary?.cashCollected ?? 0}
        loading={cashSubmitting}
        onClose={() => setCashModalVisible(false)}
        onSubmit={handleSubmitCashDenominations}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F1F3',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
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

  topCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  miniCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  miniLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  totalCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  totalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  totalButton: {
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  totalButtonDisabled: {
    opacity: 0.7,
  },
  totalButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  historyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDateText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },

  badgeSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  methodSummaryBadge: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
  },
  settledBadge: {
    backgroundColor: COLORS.greenSoft,
  },
  pendingBadge: {
    backgroundColor: COLORS.orangeSoft,
  },
  badgeInnerRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  methodSummaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  methodSummarySubText: {
    fontSize: 11,
    marginTop: 2,
  },

  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  transactionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  transactionMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  paidText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: 4,
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
});