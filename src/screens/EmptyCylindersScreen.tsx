import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../components/common/AppHeader';
import ScreenContainer from '../components/common/ScreenContainer';
import { COLORS } from '../constants/colors';
import api from '../services/api';

const DRIVER_ID = 2;

type Product = {
  id: number;
  name: string;
  type?: string;
  price?: number;
  categoryName?: string;
};

type TodayData = {
  summary: {
    collected: number;
    returned: number;
    inHand: number;
  };
  collectedFrom: {
    id: number;
    saleId: number;
    customerName: string;
    productType: string;
    quantity: number;
    createdAt: string;
  }[];
  returnRequests: {
    id: number;
    productName?: string;
    quantity: number;
    createdAt: string;
    isApproved: number;
  }[];
};

type HistoryDay = {
  date: string;
  collected: number;
  returned: number;
  inHand: number;
  collections: {
    id: number;
    customerName: string;
    productType: string;
    quantity: number;
    createdAt: string;
  }[];
  returns: {
    id: number;
    productName?: string;
    quantity: number;
    createdAt: string;
    isApproved: number;
  }[];
};

type HistoryData = {
  items: HistoryDay[];
};

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
  const [todayData, setTodayData] = useState<TodayData | null>(null);
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');

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

  const loadData = useCallback(async () => {
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
  }, [activeTab, fetchTodayData, fetchHistoryData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const resetModal = () => {
    setProductSearch('');
    setProducts([]);
    setSelectedProduct(null);
    setQuantity('');
  };

  const searchProducts = async (text: string) => {
    setProductSearch(text);
    setSelectedProduct(null);

    if (!text.trim()) {
      setProducts([]);
      return;
    }

    try {
      const response = await api.get(
        `/drivers/products/search?search=${encodeURIComponent(text)}`
      );

      if (response.data?.success) {
        setProducts(response.data.data || []);
      }
    } catch (err: any) {
      console.log('searchProducts error:', err?.response?.data || err.message);
    }
  };

  const submitReturnRequest = async () => {
    try {
      if (!selectedProduct?.id) {
        Alert.alert('Error', 'Please select product');
        return;
      }

      if (!quantity || Number(quantity) <= 0) {
        Alert.alert('Error', 'Please enter valid quantity');
        return;
      }

      setSubmitting(true);

      const response = await api.post('/drivers/empty-cylinders/return-request', {
        driver_id: DRIVER_ID,
        product_id: selectedProduct.id,
        quantity: Number(quantity),
      });

      if (response.data?.success) {
        Alert.alert('Success', 'Return request sent for approval');
        setReturnModalVisible(false);
        resetModal();
        await fetchTodayData();
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create request');
      }
    } catch (err: any) {
      console.error('submitReturnRequest error:', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text
              style={[
                styles.segmentText,
                activeTab === 'today' && styles.segmentTextActive,
              ]}
            >
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentTab, activeTab === 'history' && styles.segmentTabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
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
        ) : activeTab === 'today' ? (
          <>
            <View style={styles.statsRow}>
              <StatCard
                value={todayData?.summary?.collected ?? 0}
                label="Collected"
                color={COLORS.orange}
              />

              <StatCard
                value={todayData?.summary?.returned ?? 0}
                label="Returned"
                color={COLORS.green}
              />

              <StatCard
                value={todayData?.summary?.inHand ?? 0}
                label="In Hand"
                color="#EF4444"
              />
            </View>

            <Text style={styles.sectionTitle}>Collected From</Text>

            {todayData?.collectedFrom?.length ? (
              todayData.collectedFrom.map((item) => (
                <View key={`collected-${item.id}`} style={styles.infoCard}>
                  <View>
                    <Text style={styles.infoTitle}>{item.customerName}</Text>
                    <Text style={styles.infoSub}>
                      {item.productType} · {formatTime(item.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.qtyOrange}>{item.quantity}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No empty cylinders collected today</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Return Requests</Text>

            {todayData?.returnRequests?.length ? (
              todayData.returnRequests.map((item) => (
                <RequestCard
                  key={`request-${item.id}`}
                  quantity={item.quantity}
                  productName={item.productName}
                  createdAt={item.createdAt}
                  isApproved={item.isApproved}
                />
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No return requests</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => {
                resetModal();
                setReturnModalVisible(true);
              }}
            >
              <Ionicons name="refresh-outline" size={22} color={COLORS.white} />
              <Text style={styles.returnButtonText}>Return Empties to Godown</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {historyData?.items?.length ? (
              historyData.items.map((item) => {
                const isExpanded = expandedDate === item.date;

                return (
                  <View key={item.date} style={styles.historyCard}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={styles.historyTop}
                      onPress={() => setExpandedDate(isExpanded ? null : item.date)}
                    >
                      <View style={styles.historyLeft}>
                        <View style={styles.calendarWrap}>
                          <Ionicons
                            name="calendar-outline"
                            size={18}
                            color={COLORS.orange}
                          />
                        </View>

                        <View>
                          <Text style={styles.historyDate}>
                            {formatDateLabel(item.date)}
                          </Text>

                          <Text style={styles.historyMeta}>
                            Collected:{' '}
                            <Text style={styles.orangeText}>{item.collected}</Text>{' '}
                            Returned:{' '}
                            <Text style={styles.greenText}>{item.returned}</Text>
                          </Text>
                        </View>
                      </View>

                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={18}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.historyExpanded}>
                        <View style={styles.historyStatsRow}>
                          <MiniStat
                            value={item.collected}
                            label="Collected"
                            color={COLORS.orange}
                          />
                          <MiniStat
                            value={item.returned}
                            label="Returned"
                            color={COLORS.green}
                          />
                          <MiniStat
                            value={item.inHand}
                            label="In Hand"
                            color={COLORS.textSecondary}
                          />
                        </View>

                        <Text style={styles.historySectionLabel}>Collections</Text>

                        {item.collections?.map((row) => (
                          <View key={`h-col-${row.id}`} style={styles.historyLineCard}>
                            <View>
                              <Text style={styles.infoTitle}>{row.customerName}</Text>
                              <Text style={styles.infoSub}>
                                {row.productType} · {formatTime(row.createdAt)}
                              </Text>
                            </View>

                            <Text style={styles.qtyOrange}>{row.quantity}</Text>
                          </View>
                        ))}

                        <Text style={styles.historySectionLabel}>Returns</Text>

                        {item.returns?.map((row) => (
                          <RequestCard
                            key={`h-ret-${row.id}`}
                            quantity={row.quantity}
                            productName={row.productName}
                            createdAt={row.createdAt}
                            isApproved={row.isApproved}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No history found</Text>
              </View>
            )}
          </>
        )}
      </View>

      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReturnModalVisible(false);
          resetModal();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => {
              setReturnModalVisible(false);
              resetModal();
            }}
          />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>Return Empty Cylinders</Text>

            <Text style={styles.modalDesc}>
              This request will be sent to the Godown Manager for approval.
            </Text>

            <Text style={styles.inputLabel}>Search Product</Text>

            <TextInput
              value={productSearch}
              onChangeText={searchProducts}
              placeholder="Search cylinder"
              placeholderTextColor="#94A3B8"
              style={styles.modalInput}
            />

            {products.length > 0 && (
              <View style={styles.productDropdown}>
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={products}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.productItem}
                      onPress={() => {
                        setSelectedProduct(item);
                        setProductSearch(item.name);
                        setProducts([]);
                      }}
                    >
                      <Text style={styles.productName}>{item.name}</Text>
                      {!!item.type && <Text style={styles.productType}>{item.type}</Text>}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {!!selectedProduct && (
              <View style={styles.selectedProductBox}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                <Text style={styles.selectedProductText}>{selectedProduct.name}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Number of Cylinders</Text>

            <TextInput
              value={quantity}
              onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
              placeholder="Enter count"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              style={styles.modalInput}
            />

            <TouchableOpacity
              style={[styles.modalButton, submitting && styles.disabledButton]}
              activeOpacity={0.85}
              onPress={submitReturnRequest}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="paper-plane-outline" size={22} color={COLORS.white} />
                  <Text style={styles.modalButtonText}>Send for Approval</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

function MiniStat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function RequestCard({
  quantity,
  productName,
  createdAt,
  isApproved,
}: {
  quantity: number;
  productName?: string;
  createdAt: string;
  isApproved: number;
}) {
  const approved = Number(isApproved) === 1;

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestLeft}>
        <Ionicons
          name={approved ? 'checkmark-circle-outline' : 'time-outline'}
          size={20}
          color={approved ? COLORS.green : COLORS.orange}
          style={styles.requestIcon}
        />

        <View>
          <Text style={styles.requestTitle}>
            {quantity} {quantity === 1 ? 'Cylinder' : 'Cylinders'}
          </Text>

          {!!productName && <Text style={styles.requestProduct}>{productName}</Text>}

          <Text style={styles.requestTime}>{formatTime(createdAt)}</Text>
        </View>
      </View>

      <View style={[styles.badge, approved ? styles.approvedBadge : styles.pendingBadge]}>
        <Text style={[styles.badgeText, approved ? styles.approvedText : styles.pendingText]}>
          {approved ? 'Approved' : 'Awaiting Approval'}
        </Text>
      </View>
    </View>
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
    fontWeight: '900',
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
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  segmentTabActive: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  segmentText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  segmentTextActive: {
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
    paddingVertical: 16,
    alignItems: 'center',
  },

  statValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
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
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  infoSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  qtyOrange: {
    fontSize: 22,
    fontWeight: '900',
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
    flex: 1,
  },

  requestIcon: {
    marginRight: 8,
  },

  requestTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  requestProduct: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  requestTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  badge: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 8,
  },

  approvedBadge: {
    backgroundColor: COLORS.greenSoft,
  },

  pendingBadge: {
    backgroundColor: COLORS.orangeSoft,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '900',
  },

  approvedText: {
    color: COLORS.green,
  },

  pendingText: {
    color: COLORS.orange,
  },

  returnButton: {
    height: 60,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },

  returnButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },

  historyCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },

  historyTop: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  calendarWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  historyDate: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  historyMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  orangeText: {
    color: COLORS.orange,
    fontWeight: '900',
  },

  greenText: {
    color: COLORS.green,
    fontWeight: '900',
  },

  historyExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 14,
    paddingBottom: 14,
  },

  historyStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },

  miniStat: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  miniStatValue: {
    fontSize: 18,
    fontWeight: '900',
  },

  miniStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  historySectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },

  historyLineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 14,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 99,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 22,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  modalDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 18,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  modalInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },

  productDropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    maxHeight: 180,
    marginTop: -10,
    marginBottom: 16,
    overflow: 'hidden',
  },

  productItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  productType: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  selectedProductBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },

  selectedProductText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.green,
    flex: 1,
  },

  modalButton: {
    height: 60,
    backgroundColor: '#8BB5F9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 2,
  },

  modalButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.65,
  },
});