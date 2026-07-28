import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { DS, TYPO, EYEBROW, RADIUS, PALETTE, WEIGHT } from '../../constants/designSystem';
import { API_SERVER_ROOT } from '../../services/api';
import {
  acceptEmptyCylinderLoad,
  completeEmptyCylinderLoad,
  getEmptyCylinderLoadDetail,
  rejectEmptyCylinderLoad,
  uploadEmptyLoadInvoice,
} from '../../services/emptyCylinderLoadService';
import type { EmptyCylinderLoadDetail, EmptyCylinderLoadItem } from '../../types';

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const statusColors = (status?: string) => {
  if (status === 'COMPLETED' || status === 'ACCEPTED') {
    return { bg: DS.greenSoft, text: PALETTE.green600 };
  }
  if (status === 'REJECTED') {
    return { bg: DS.redSoft, text: DS.red };
  }
  return { bg: DS.orangeSoft, text: DS.orangeText };
};

export default function PurchaseEmptyLoadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [load, setLoad] = useState<EmptyCylinderLoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [rejectVisible, setRejectVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [invoiceUri, setInvoiceUri] = useState<string | null>(null);

  const fetchDetail = async (withRefresh = false) => {
    try {
      if (withRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getEmptyCylinderLoadDetail(id);
      setLoad(data);
      setInvoiceUri(data.invoiceUrl ?? null);
    } catch (error) {
      console.log('Empty load detail error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const notifyUpdated = () => {
    DeviceEventEmitter.emit('PURCHASE_FLOW_UPDATED');
  };

  const handleAccept = async () => {
    try {
      setBusy(true);
      await acceptEmptyCylinderLoad(id);
      notifyUpdated();
      await fetchDetail(true);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? String(error.response.data.message)
          : 'Failed to accept load';
      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Required', 'Please enter a reason for rejection');
      return;
    }

    try {
      setBusy(true);
      await rejectEmptyCylinderLoad(id, rejectReason.trim());
      setRejectVisible(false);
      setRejectReason('');
      notifyUpdated();
      await fetchDetail(true);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? String(error.response.data.message)
          : 'Failed to reject load';
      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  };

  const handlePickInvoice = async (source: 'camera' | 'gallery') => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) return;

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });

      if (!result.canceled) {
        setInvoiceUri(result.assets[0]?.uri ?? null);
      }
    } catch (error) {
      console.log('Pick invoice error:', error);
    }
  };

  const handleComplete = async () => {
    try {
      setBusy(true);

      let uploadedUrl: string | null = load?.invoiceUrl ?? null;

      // Upload only if the driver picked a new local image (not an already-hosted URL).
      if (invoiceUri && !invoiceUri.startsWith('http') && !invoiceUri.startsWith('/uploads')) {
        uploadedUrl = await uploadEmptyLoadInvoice(invoiceUri);
      }

      await completeEmptyCylinderLoad(id, uploadedUrl);
      notifyUpdated();
      await fetchDetail(true);
      Alert.alert('Success', 'Delivery confirmed and load completed');
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? String(error.response.data.message)
          : 'Failed to complete load';
      Alert.alert('Error', message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.loaderBox}>
          <ActivityIndicator color={DS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!load) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.loaderBox}>
          <Text style={styles.infoText}>Load not found.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const pill = statusColors(load.status);
  const invoicePreviewUri =
    invoiceUri && !invoiceUri.startsWith('http') && !invoiceUri.startsWith('/uploads')
      ? invoiceUri
      : invoiceUri
        ? `${API_SERVER_ROOT}${invoiceUri}`
        : null;

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchDetail(true)} />
      }
    >
      <AppHeader />

      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Loads</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <Text style={styles.title}>Load #{load.id}</Text>
          <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
            <Text style={[styles.statusText, { color: pill.text }]}>
              {load.statusLabel}
            </Text>
          </View>
        </View>

        {/* Dispatch summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dispatch Summary</Text>
          <SummaryRow label="Dispatched" value={formatDateTime(load.dispatchedAt)} />
          <SummaryRow label="Assigned by" value={load.assignedBy} />
          <SummaryRow label="Vehicle" value={load.vehicleNumber} />
          {load.ervNumber ? (
            <SummaryRow label="ERV number" value={load.ervNumber} />
          ) : null}
          <SummaryRow label="Total empties" value={String(load.totalQuantity)} />
          {load.status === 'REJECTED' && load.rejectReason ? (
            <SummaryRow label="Reject reason" value={load.rejectReason} />
          ) : null}
          {load.completedAt ? (
            <SummaryRow label="Completed" value={formatDateTime(load.completedAt)} />
          ) : null}
        </View>

        <CategorySection
          title="Domestic Empty Cylinders"
          total={load.domesticQuantity}
          items={load.domesticItems}
        />

        <CategorySection
          title="Commercial Empty Cylinders"
          total={load.commercialQuantity}
          items={load.commercialItems}
        />

        {/* Completion — invoice + confirm (only when accepted) */}
        {load.status === 'ACCEPTED' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>IOC Invoice (optional)</Text>

            {invoicePreviewUri ? (
              <Image source={{ uri: invoicePreviewUri }} style={styles.invoiceImage} />
            ) : null}

            <View style={styles.rowGap}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handlePickInvoice('camera')}
              >
                <Ionicons name="camera-outline" size={18} color={DS.primary} />
                <Text style={styles.secondaryButtonText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handlePickInvoice('gallery')}
              >
                <Ionicons name="image-outline" size={18} color={DS.primary} />
                <Text style={styles.secondaryButtonText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, busy && styles.disabledButton]}
              disabled={busy}
              onPress={handleComplete}
            >
              {busy ? (
                <ActivityIndicator color={DS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={DS.white} />
                  <Text style={styles.primaryButtonText}>Confirm Delivery</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Accept / Reject (only when pending) */}
        {load.status === 'PENDING' ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.rejectButton, busy && styles.disabledButton]}
              disabled={busy}
              onPress={() => setRejectVisible(true)}
            >
              <Ionicons name="close-circle-outline" size={20} color={DS.red} />
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, styles.flex1, busy && styles.disabledButton]}
              disabled={busy}
              onPress={handleAccept}
            >
              {busy ? (
                <ActivityIndicator color={DS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={DS.white} />
                  <Text style={styles.primaryButtonText}>Accept Load</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Reject reason modal */}
      <Modal visible={rejectVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Reject Load</Text>
            <Text style={styles.modalHint}>
              Enter a reason. The empties will be returned to the godown stock.
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Reason for rejection"
              placeholderTextColor={DS.textTertiary}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />

            <View style={styles.rowGap}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setRejectVisible(false);
                  setRejectReason('');
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectButton, styles.flex1, busy && styles.disabledButton]}
                disabled={busy}
                onPress={handleReject}
              >
                {busy ? (
                  <ActivityIndicator color={DS.red} />
                ) : (
                  <Text style={styles.rejectButtonText}>Confirm Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function CategorySection({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: EmptyCylinderLoadItem[];
}) {
  return (
    <View style={styles.card}>
      <View style={styles.categoryHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.categoryTotal}>{total}</Text>
      </View>

      {items.length ? (
        items.map((item) => (
          <View key={item.productId} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>{item.quantity}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.infoText}>None in this load.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderBox: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  backText: {
    ...TYPO.b4,
    fontWeight: WEIGHT.semibold,
    color: DS.primary,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    ...TYPO.h5,
    color: DS.textPrimary,
  },
  statusPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: {
    ...TYPO.c3,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: DS.card,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: {
    ...TYPO.s1,
    color: DS.textPrimary,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    ...TYPO.b3,
    color: DS.textSecondary,
  },
  summaryValue: {
    ...TYPO.b3,
    color: DS.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
    paddingLeft: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTotal: {
    ...TYPO.h5,
    color: DS.primary,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: DS.divider,
  },
  itemName: {
    ...TYPO.b2,
    color: DS.textPrimary,
    flexShrink: 1,
  },
  itemQty: {
    ...TYPO.s1,
    color: DS.textPrimary,
    paddingLeft: 12,
  },
  infoText: {
    ...TYPO.b3,
    color: DS.textSecondary,
  },
  invoiceImage: {
    width: '100%',
    height: 180,
    borderRadius: RADIUS.md,
    marginBottom: 12,
    backgroundColor: DS.surface,
  },
  rowGap: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    ...TYPO.s2,
    color: DS.primary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: DS.buttonGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  primaryButtonText: {
    ...TYPO.s1,
    color: DS.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  flex1: {
    flex: 1,
  },
  rejectButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DS.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rejectButtonText: {
    ...TYPO.s1,
    color: DS.red,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    paddingBottom: 32,
  },
  modalTitle: {
    ...TYPO.h5,
    color: DS.textPrimary,
    marginBottom: 8,
  },
  modalHint: {
    ...TYPO.b3,
    color: DS.textSecondary,
    marginBottom: 14,
  },
  reasonInput: {
    ...TYPO.b2,
    minHeight: 90,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    padding: 14,
    color: DS.textPrimary,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});
