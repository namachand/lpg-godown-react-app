import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

type ProductType = 'DOMESTIC' | 'COMMERCIAL';

type AllocatedCylinderItem = {
  id: number;
  saleItemId: number;
  saleId: number;
  allocationSaleId: number;
  allocationSalesItemId: number;
  batchNo: string;
  productId: number;
  productName: string;
  productType: ProductType;
  size?: string;
  totalAllocated: number;
  delivered: number;
  returned?: number;
  defective?: number;
  pending: number;
  lastAllocatedAt: string;
  latestSaleId: number;
};

type AllocatedResponse = {
  summary: {
    totalAllocated: number;
    delivered: number;
    pending: number;
    returned?: number;
    defective?: number;
  };
  items: AllocatedCylinderItem[];
};

type BatchCounterItem = {
  productId: number;
  productName: string;
  productType: ProductType;
  size: string;
  maxQuantity: number;
  quantity: number;
};

const formatProductType = (type?: string) => {
  if (type === 'DOMESTIC') return 'Domestic';
  if (type === 'COMMERCIAL') return 'Commercial';
  return type || '';
};

const getProductSize = (item: Partial<AllocatedCylinderItem>) => {
  if (item.size) return item.size;
  const match = item.productName?.match(/\d+\.?\d*\s?kg/i);
  return match?.[0] ? match[0].replace(/\s/g, ' ') : '';
};

const formatDate = (date?: string) => {
  if (!date) return '-';

  try {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '-';
  }
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
      returned: 0,
      defective: 0,
    },
    items: [],
  });

  const [selectedBatch, setSelectedBatch] =
    useState<AllocatedCylinderItem | null>(null);

  const [counterItems, setCounterItems] = useState<BatchCounterItem[]>([]);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [defectiveModalVisible, setDefectiveModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
            returned: 0,
            defective: 0,
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

  const openBatchDetail = async (item: AllocatedCylinderItem) => {
    try {
      setBatchLoading(true);

      const response = await api.get(
        `/drivers/${DRIVER_ID}/allocated-batches/${item.allocationSalesItemId}`
      );

      if (response.data?.success) {
        const detail = response.data.data;

        setSelectedBatch({
          ...item,
          ...detail,
          id: detail.allocationSalesItemId,
          saleItemId: detail.allocationSalesItemId,
          saleId: detail.allocationSaleId,
          allocationSaleId: detail.allocationSaleId,
          allocationSalesItemId: detail.allocationSalesItemId,
          batchNo: detail.batchNo,
          productId: detail.productId,
          productName: detail.productName,
          productType: detail.productType,
          size: detail.size,
          totalAllocated: detail.totalAllocated,
          delivered: detail.delivered,
          returned: detail.returned,
          defective: detail.defective,
          pending: detail.pending,
          lastAllocatedAt: detail.allocatedAt,
          latestSaleId: detail.allocationSaleId,
        });
      } else {
        Alert.alert('Error', response.data?.message || 'Batch not found');
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to open batch'
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const buildCounterItems = () => {
    if (!selectedBatch) return;

    setCounterItems([
      {
        productId: selectedBatch.productId,
        productName: selectedBatch.productName,
        productType: selectedBatch.productType,
        size: getProductSize(selectedBatch),
        maxQuantity: selectedBatch.pending,
        quantity: 0,
      },
    ]);
  };

  const openReturnModal = () => {
    buildCounterItems();
    setReturnModalVisible(true);
  };

  const openDefectiveModal = () => {
    buildCounterItems();
    setDefectiveModalVisible(true);
  };

  const updateCounter = (index: number, direction: 'PLUS' | 'MINUS') => {
    setCounterItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextValue =
          direction === 'PLUS'
            ? Math.min(item.quantity + 1, item.maxQuantity)
            : Math.max(item.quantity - 1, 0);

        return {
          ...item,
          quantity: nextValue,
        };
      })
    );
  };

  const totalSelected = counterItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const submitBatchRequest = async (isDefective: 0 | 1) => {
    if (!selectedBatch) return;

    const validItems = counterItems.filter((item) => item.quantity > 0);

    if (!validItems.length) {
      Alert.alert('Required', 'Please select at least one cylinder');
      return;
    }

    try {
      setSubmitting(true);

      const response = await api.post('/drivers/in-hand/request', {
        driver_id: DRIVER_ID,
        is_defective: isDefective,
        allocation_sale_id: selectedBatch.allocationSaleId,
        allocation_sales_item_id: selectedBatch.allocationSalesItemId,
        batch_no: selectedBatch.batchNo,
        items: validItems.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
          allocation_sale_id: selectedBatch.allocationSaleId,
          allocation_sales_item_id: selectedBatch.allocationSalesItemId,
          batch_no: selectedBatch.batchNo,
        })),
      });

      if (response.data?.success) {
        Alert.alert(
          'Success',
          isDefective === 1
            ? 'Defective request submitted'
            : 'Return request submitted'
        );

        setReturnModalVisible(false);
        setDefectiveModalVisible(false);
        setCounterItems([]);
        setSelectedBatch(null);

        await fetchAllocatedCylinders();
      } else {
        Alert.alert('Error', response.data?.message || 'Request failed');
      }
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to submit request'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (selectedBatch) {
    return (
      <ScreenContainer>
        <AppHeader />

        <View style={styles.content}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedBatch(null)}
            >
              <Ionicons
                name="arrow-back"
                size={30}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>

            <Text style={styles.detailTitle}>
              {selectedBatch.productType === 'DOMESTIC'
                ? 'LPG Domestic'
                : 'LPG Commercial'}
            </Text>
          </View>

          <View style={styles.detailMainCard}>
            <View style={styles.detailTopRow}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="cube-outline"
                  size={46}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.detailTitleBox}>
                <Text style={styles.detailUnits}>
                  {selectedBatch.totalAllocated} units
                </Text>

                <Text style={styles.detailSubText}>
                  {formatProductType(selectedBatch.productType)} ·{' '}
                  {getProductSize(selectedBatch)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}># {selectedBatch.batchNo}</Text>

              <Ionicons
                name="calendar-outline"
                size={18}
                color={COLORS.textSecondary}
              />

              <Text style={styles.metaText}>
                {formatDate(selectedBatch.lastAllocatedAt)}
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: getProgressWidth(selectedBatch) },
                ]}
              />
            </View>

            <View style={styles.detailStatsRow}>
              <DetailStat
                label="TOTAL"
                value={selectedBatch.totalAllocated}
                color={COLORS.textPrimary}
                bg="#FAFAFA"
              />

              <DetailStat
                label="DELIVERED"
                value={selectedBatch.delivered}
                color={COLORS.green}
                bg={COLORS.greenSoft}
              />

              <DetailStat
                label="PENDING"
                value={selectedBatch.pending}
                color={COLORS.orange}
                bg={COLORS.orangeSoft}
              />
            </View>
          </View>

          <View style={styles.smallStatsRow}>
            <View style={styles.smallStatCard}>
              <View style={styles.smallStatIconBlue}>
                <Ionicons
                  name="home-outline"
                  size={28}
                  color={COLORS.primary}
                />
              </View>

              <View>
                <Text style={styles.smallStatLabel}>DOMESTIC</Text>
                <Text style={styles.smallStatValue}>
                  {selectedBatch.productType === 'DOMESTIC'
                    ? selectedBatch.totalAllocated
                    : 0}
                </Text>
              </View>
            </View>

            <View style={styles.smallStatCard}>
              <View style={styles.smallStatIconOrange}>
                <Ionicons
                  name="business-outline"
                  size={28}
                  color={COLORS.orange}
                />
              </View>

              <View>
                <Text style={styles.smallStatLabel}>COMMERCIAL</Text>
                <Text style={styles.smallStatValue}>
                  {selectedBatch.productType === 'COMMERCIAL'
                    ? selectedBatch.totalAllocated
                    : 0}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>ITEM WEIGHTS</Text>

          <View style={styles.weightList}>
            <View style={styles.weightRow}>
              <View style={styles.weightLeft}>
                <Ionicons
                  name="bag-handle-outline"
                  size={24}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.weightText}>
                  {getProductSize(selectedBatch)}
                </Text>
              </View>

              <View style={styles.weightRight}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {formatProductType(selectedBatch.productType)}
                  </Text>
                </View>

                <Text style={styles.weightQty}>{selectedBatch.pending}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.returnOutlineButton}
            onPress={openReturnModal}
          >
            <Ionicons
              name="return-up-back-outline"
              size={28}
              color={COLORS.primary}
            />
            <Text style={styles.returnOutlineText}>Return in-hand to Godown</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.defectiveOutlineButton}
            onPress={openDefectiveModal}
          >
            <Ionicons name="warning-outline" size={28} color="#E05252" />
            <Text style={styles.defectiveOutlineText}>
              Report Defective Cylinder
            </Text>
          </TouchableOpacity>
        </View>

        <BatchCounterModal
          visible={returnModalVisible}
          title="Return to Godown"
          subtitle={`Select items and set the count from batch ${selectedBatch.batchNo}`}
          icon="return-up-back-outline"
          iconColor={COLORS.primary}
          buttonText="Confirm Return"
          buttonColor="#8FB3F4"
          items={counterItems}
          totalSelected={totalSelected}
          submitting={submitting}
          onClose={() => setReturnModalVisible(false)}
          onChange={updateCounter}
          onSubmit={() => submitBatchRequest(0)}
        />

        <BatchCounterModal
          visible={defectiveModalVisible}
          title="Report Defective"
          subtitle={`Select items and set the count from batch ${selectedBatch.batchNo}`}
          icon="warning-outline"
          iconColor="#E05252"
          buttonText="Submit Report"
          buttonColor="#EFA0A0"
          items={counterItems}
          totalSelected={totalSelected}
          submitting={submitting}
          onClose={() => setDefectiveModalVisible(false)}
          onChange={updateCounter}
          onSubmit={() => submitBatchRequest(1)}
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

        {loading || batchLoading ? (
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
              key={`${item.batchNo}-${item.allocationSalesItemId}`}
              activeOpacity={0.88}
              onPress={() => openBatchDetail(item)}
            >
              <AllocatedCard item={item} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No allocated cylinders found</Text>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

function AllocatedCard({ item }: { item: AllocatedCylinderItem }) {
  const size = getProductSize(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Ionicons name="cube-outline" size={48} color={COLORS.primary} />
        </View>

        <View style={styles.productInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.productName}
            </Text>

            <View style={styles.typePill}>
              <Text style={styles.typePillText}>
                {formatProductType(item.productType)}
              </Text>
            </View>
          </View>

          <Text style={styles.productSize}>{size}</Text>

          <View style={styles.batchRow}>
            <Text style={styles.batchText}># {item.batchNo}</Text>

            <Ionicons
              name="calendar-outline"
              size={17}
              color={COLORS.textSecondary}
            />

            <Text style={styles.batchText}>{formatDate(item.lastAllocatedAt)}</Text>
          </View>
        </View>

        <View style={styles.unitsBox}>
          <Text style={styles.unitsValue}>{item.totalAllocated}</Text>
          <Text style={styles.unitsLabel}>units</Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={34}
          color={COLORS.textSecondary}
        />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: getProgressWidth(item) }]} />
      </View>

      <View style={styles.statsRow}>
        <MiniStat
          icon="cube-outline"
          label="TOTAL"
          value={item.totalAllocated}
          color={COLORS.primary}
          bg="#FBFBFC"
        />

        <MiniStat
          icon="checkmark-circle-outline"
          label="DELIVERED"
          value={item.delivered}
          color={COLORS.green}
          bg={COLORS.greenSoft}
        />

        <MiniStat
          icon="time-outline"
          label="PENDING"
          value={item.pending}
          color={COLORS.orange}
          bg={COLORS.orangeSoft}
        />
      </View>
    </View>
  );
}

function MiniStat({
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
    <View style={[styles.miniStat, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={26} color={color} />

      <View>
        <Text style={styles.miniLabel}>{label}</Text>
        <Text style={[styles.miniValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function DetailStat({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.detailStatCard, { backgroundColor: bg }]}>
      <Text style={styles.detailStatLabel}>{label}</Text>
      <Text style={[styles.detailStatValue, { color }]}>{value}</Text>
    </View>
  );
}

function BatchCounterModal({
  visible,
  title,
  subtitle,
  icon,
  iconColor,
  buttonText,
  buttonColor,
  items,
  totalSelected,
  submitting,
  onClose,
  onChange,
  onSubmit,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  icon: any;
  iconColor: string;
  buttonText: string;
  buttonColor: string;
  items: BatchCounterItem[];
  totalSelected: number;
  submitting: boolean;
  onClose: () => void;
  onChange: (index: number, direction: 'PLUS' | 'MINUS') => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleRow}>
              <Ionicons name={icon} size={30} color={iconColor} />
              <Text style={styles.modalTitle}>{title}</Text>
            </View>

            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close-outline"
                size={34}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          <View style={styles.counterList}>
            {items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.counterRow}>
                <View style={styles.counterLeft}>
                  <Ionicons
                    name="bag-handle-outline"
                    size={30}
                    color={COLORS.textSecondary}
                  />

                  <View>
                    <Text style={styles.counterName}>{item.size}</Text>
                    <Text style={styles.counterMeta}>
                      {formatProductType(item.productType)} · max {item.maxQuantity}
                    </Text>
                  </View>
                </View>

                <View style={styles.counterRight}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => onChange(index, 'MINUS')}
                  >
                    <Text style={styles.counterButtonText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.counterValue}>{item.quantity}</Text>

                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => onChange(index, 'PLUS')}
                  >
                    <Text style={styles.counterButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.totalSelectedRow}>
            <Text style={styles.totalSelectedText}>Total selected</Text>
            <Text style={styles.totalSelectedValue}>{totalSelected}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.modalSubmitButton,
              {
                backgroundColor: totalSelected > 0 ? buttonColor : '#AFC8F7',
              },
            ]}
            disabled={submitting || totalSelected <= 0}
            onPress={onSubmit}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.modalSubmitText}>{buttonText}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  backButton: {
    width: 42,
    alignItems: 'flex-start',
  },

  titleTextWrap: {
    flex: 1,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },

  pageSubTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 3,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 18,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBox: {
    width: 86,
    height: 86,
    borderRadius: 24,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  productInfo: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  productName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },

  typePill: {
    backgroundColor: '#F1F1F2',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  typePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  productSize: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 7,
  },

  batchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },

  batchText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  unitsBox: {
    alignItems: 'center',
    marginLeft: 8,
  },

  unitsValue: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  unitsLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textSecondary,
    marginTop: -4,
  },

  progressTrack: {
    height: 10,
    backgroundColor: '#F1F1F1',
    borderRadius: 99,
    overflow: 'hidden',
    marginTop: 22,
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 99,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },

  miniStat: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  miniLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },

  miniValue: {
    fontSize: 20,
    fontWeight: '900',
    marginTop: 1,
  },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  detailTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  detailMainCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    marginBottom: 26,
  },

  detailTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  detailIconBox: {
    width: 94,
    height: 94,
    borderRadius: 18,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
  },

  detailTitleBox: {
    flex: 1,
  },

  detailUnits: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  detailSubText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
  },

  metaText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  detailStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },

  detailStatCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },

  detailStatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  detailStatValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },

  smallStatsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 26,
  },

  smallStatCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: COLORS.white,
  },

  smallStatIconBlue: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blueSoft,
  },

  smallStatIconOrange: {
    width: 68,
    height: 68,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orangeSoft,
  },

  smallStatLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  smallStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 14,
  },

  weightList: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    marginBottom: 34,
  },

  weightRow: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  weightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  weightText: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  weightRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  typeBadge: {
    backgroundColor: '#F1F1F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },

  typeBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },

  weightQty: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  returnOutlineButton: {
    height: 74,
    borderWidth: 1,
    borderColor: '#8DB7FF',
    borderRadius: 18,
    backgroundColor: '#F4F8FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 14,
  },

  returnOutlineText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
  },

  defectiveOutlineButton: {
    height: 74,
    borderWidth: 1,
    borderColor: '#F5B6B6',
    borderRadius: 18,
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  defectiveOutlineText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E05252',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 22,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  modalSubtitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginTop: 16,
    marginBottom: 28,
  },

  counterList: {
    gap: 12,
  },

  counterRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },

  counterName: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  counterMeta: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  counterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },

  counterButton: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  counterButtonText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  counterValue: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  totalSelectedRow: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: -18,
    marginTop: 28,
    paddingHorizontal: 18,
    paddingTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  totalSelectedText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  totalSelectedValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  modalSubmitButton: {
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  modalSubmitText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
  },

  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  infoText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },

  errorText: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '700',
  },

  retryButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryButtonText: {
    color: COLORS.white,
    fontWeight: '800',
  },

  emptyBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
});