import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DS, TYPO, EYEBROW, RADIUS, PALETTE, WEIGHT } from '../../constants/designSystem';
import { API_SERVER_ROOT } from '../../services/api';
import {
  attachPurchaseLoadInvoice,
  cancelPurchaseLoad,
  getActivePurchaseTrip,
  getPurchaseBootstrap,
  getPurchaseLoadDetail,
  getPurchaseLoads,
  submitPurchaseTrip,
  uploadOdometerImage,
} from '../../services/purchaseService';
import type { PurchaseLoad } from '../../types';

type InvoiceMap = Record<number, string | null>;

const resolveImageUrl = (value?: string | null) => {
  if (!value) return null;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${API_SERVER_ROOT}${value}`;
  return value;
};

const formatStatusColors = (status: PurchaseLoad['status']) => {
  if (status === 'APPROVED') {
    return { bg: DS.greenSoft, text: PALETTE.green600, label: 'APPROVED' };
  }

  if (status === 'PENDING') {
    return { bg: DS.orangeSoft, text: DS.orangeText, label: 'WAITING APPROVAL' };
  }

  if (status === 'CANCELLED') {
    return { bg: DS.grey100, text: DS.textSecondary, label: 'CANCELLED' };
  }

  // DRAFT → display as IN PROGRESS
  return { bg: DS.primarySoft, text: DS.primary, label: 'IN PROGRESS' };
};

export default function PurchaseLoadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tripId, setTripId] = useState<number | null>(null);
  const [tripStatus, setTripStatus] = useState<string>('IN_PROGRESS');
  const [loads, setLoads] = useState<PurchaseLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoiceUris, setInvoiceUris] = useState<InvoiceMap>({});
  const [submittingInvoiceLoadId, setSubmittingInvoiceLoadId] = useState<number | null>(null);
  const [cancellingLoadId, setCancellingLoadId] = useState<number | null>(null);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [endTripModalVisible, setEndTripModalVisible] = useState(false);
  const [endOdometerImageUri, setEndOdometerImageUri] = useState<string | null>(null);
  const [endOdometerReading, setEndOdometerReading] = useState('');

  const submitTripForApproval = async (
    targetTripId: number,
    endImageUrl: string,
    endReading: number,
    showErrorAlert = true
  ) => {
    try {
      setSubmittingTrip(true);
      await submitPurchaseTrip(targetTripId, {
        endOdometerImageUrl: endImageUrl,
        endOdometerReading: endReading,
      });
      setTripStatus('WAITING_APPROVAL');
      setLoads((prev) =>
        prev.map((item) =>
          item.status === 'DRAFT' ? { ...item, status: 'PENDING' } : item
        )
      );
      DeviceEventEmitter.emit('PURCHASE_FLOW_UPDATED');
      setEndTripModalVisible(false);
      setEndOdometerImageUri(null);
      setEndOdometerReading('');
      router.replace('/purchase-home' as any);
      return true;
    } catch (error) {
      if (showErrorAlert && isAxiosError(error) && error.response?.data?.message) {
        Alert.alert('Unable to submit trip', String(error.response.data.message));
      }
      console.log('Submit purchase trip error:', error);
      return false;
    } finally {
      setSubmittingTrip(false);
    }
  };

  const handlePickTripEndImage = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.6,
        });

        if (!result.canceled) {
          setEndOdometerImageUri(result.assets[0]?.uri ?? null);
        }

        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (!result.canceled) {
        setEndOdometerImageUri(result.assets[0]?.uri ?? null);
      }
    } catch (error) {
      console.log('Pick end odometer image error:', error);
    }
  };

  const syncTripBoard = async (withRefresh = false) => {
    try {
      if (withRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const firstLoad = await getPurchaseLoadDetail(id);
      const currentTripId = firstLoad.tripId;

      const bootstrap = await getPurchaseBootstrap();

      const [loadList, activeTrip] = await Promise.all([
        getPurchaseLoads(bootstrap.manager.id),
        getActivePurchaseTrip(bootstrap.manager.id),
      ]);

      const tripLoadSummaries = loadList
        .filter((item) => item.tripId === currentTripId)
        .sort((a, b) => b.id - a.id);

      const tripLoads = await Promise.all(
        tripLoadSummaries.map(async (item) => {
          try {
            return await getPurchaseLoadDetail(item.id);
          } catch {
            return item;
          }
        })
      );

      setTripId(currentTripId);
      setTripStatus(
        activeTrip?.id === currentTripId
          ? activeTrip.status
          : firstLoad.tripStatus || activeTrip?.status || 'IN_PROGRESS'
      );
      setLoads(tripLoads);
      setInvoiceUris((prev) => {
        const next: InvoiceMap = { ...prev };

        for (const item of tripLoads) {
          if (next[item.id] === undefined) {
            next[item.id] = item.invoiceUrl ?? null;
          }
        }

        return next;
      });
    } catch (error) {
      console.log('Purchase load detail error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    syncTripBoard();

    const subscription = DeviceEventEmitter.addListener(
      'PURCHASE_FLOW_UPDATED',
      () => syncTripBoard(true)
    );

    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handlePickInvoice = async (loadId: number, source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.6,
        });

        if (!result.canceled) {
          setInvoiceUris((prev) => ({
            ...prev,
            [loadId]: result.assets[0]?.uri ?? null,
          }));
        }

        return;
      }

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
      });

      if (!result.canceled) {
        setInvoiceUris((prev) => ({
          ...prev,
          [loadId]: result.assets[0]?.uri ?? null,
        }));
      }
    } catch (error) {
      console.log('Pick invoice error:', error);
    }
  };

  const handleSubmitInvoice = async (loadId: number) => {
    const load = loads.find((item) => item.id === loadId);

    if (!load || load.status !== 'DRAFT' || tripStatus !== 'IN_PROGRESS') {
      return;
    }

    const invoiceUri = invoiceUris[loadId] ?? null;

    try {
      setSubmittingInvoiceLoadId(loadId);

      let finalInvoiceUrl = invoiceUri;
      if (
        invoiceUri &&
        !invoiceUri.startsWith('http://') &&
        !invoiceUri.startsWith('https://') &&
        !invoiceUri.startsWith('/uploads/')
      ) {
        try {
          finalInvoiceUrl = await uploadOdometerImage(invoiceUri);
        } catch (uploadError) {
          console.log('Invoice image upload failed:', uploadError);
          Alert.alert(
            'Upload Failed',
            'Could not upload the invoice image. Please check your connection and try again.'
          );
          return;
        }
      }

      // If user picked a new image use GALLERY, otherwise reuse existing source
      const source =
        finalInvoiceUrl && finalInvoiceUrl !== load.invoiceUrl
          ? 'GALLERY'
          : (load.invoiceSource ?? null);

      const updatedLoad = await attachPurchaseLoadInvoice(loadId, {
        invoiceUrl: finalInvoiceUrl,
        invoiceSource: finalInvoiceUrl ? (source as 'CAMERA' | 'GALLERY' | null) : null,
      });

      setLoads((prev) => prev.map((item) => (item.id === loadId ? updatedLoad : item)));
      DeviceEventEmitter.emit('PURCHASE_FLOW_UPDATED');
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        Alert.alert('Error', String(error.response.data.message));
      }
      console.log('Attach load invoice error:', error);
    } finally {
      setSubmittingInvoiceLoadId(null);
    }
  };

  const handleCancelLoad = async (loadId: number) => {
    Alert.alert('Cancel this load?', 'This will mark the selected load as cancelled.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            setCancellingLoadId(loadId);
            await cancelPurchaseLoad(loadId);
            DeviceEventEmitter.emit('PURCHASE_FLOW_UPDATED');
            await syncTripBoard(true);
          } catch (error) {
            console.log('Cancel purchase load error:', error);
          } finally {
            setCancellingLoadId(null);
          }
        },
      },
    ]);
  };

  const handleAddLoad = () => {
    if (!tripId || tripStatus !== 'IN_PROGRESS') {
      return;
    }

    router.push({
      pathname: '/purchase/create-load',
      params: { tripId: String(tripId) },
    } as any);
  };

  const handleOpenLoad = (load: PurchaseLoad) => {
    if (!tripId) {
      return;
    }

    if (tripStatus === 'IN_PROGRESS' && load.status === 'DRAFT') {
      router.push({
        pathname: '/purchase/create-load',
        params: { tripId: String(tripId), loadId: String(load.id) },
      } as any);
    }
  };

  const handleSubmitTrip = async () => {
    if (!tripId) {
      return;
    }

    setEndTripModalVisible(true);
  };

  const handleConfirmTripSubmit = async () => {
    const parsedEndReading = Number(endOdometerReading);

    if (
      !tripId ||
      !endOdometerImageUri ||
      !Number.isFinite(parsedEndReading) ||
      parsedEndReading <= 0
    ) {
      return;
    }

    try {
      setSubmittingTrip(true);
      const uploadedUrl = await uploadOdometerImage(endOdometerImageUri);
      await submitTripForApproval(tripId, uploadedUrl, parsedEndReading);
    } catch (error) {
      console.log('Upload end odometer error:', error);
      Alert.alert('Upload failed', 'Could not upload odometer image. Please try again.');
      setSubmittingTrip(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={DS.primary} />
      </View>
    );
  }

  if (!tripId) {
    return (
      <View style={styles.loaderScreen}>
        <Text style={styles.emptyText}>Trip not found.</Text>
      </View>
    );
  }

  const activeLoads = loads.filter((item) => item.status !== 'CANCELLED');
  const allLoadsSubmittedForApproval =
    activeLoads.length > 0 && activeLoads.every((item) => item.status !== 'DRAFT');
  const canEndTrip = allLoadsSubmittedForApproval && !submittingTrip;

  return (
    <View style={styles.screen}>
      <View style={styles.headerCard}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.replace('/purchase-home' as any)}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={DS.white} />
          </TouchableOpacity>

          <View>
            <Text style={styles.tripLabel}>TRIP ID</Text>
            <Text style={styles.tripValue}>#{tripId}</Text>
          </View>
        </View>

        <View style={styles.progressPill}>
          <Text style={styles.progressText}>{tripStatus}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentBody}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => syncTripBoard(true)} />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CYLINDER LOADS ({loads.length})</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.inlineAddButton,
              tripStatus !== 'IN_PROGRESS' ? styles.inlineAddButtonDisabled : null,
            ]}
            disabled={tripStatus !== 'IN_PROGRESS'}
            onPress={handleAddLoad}
          >
            <Ionicons name="add" size={14} color={DS.white} />
            <Text style={styles.inlineAddText}>Add Load</Text>
          </TouchableOpacity>
        </View>

        {loads.map((load) => {
          const invoiceUri = resolveImageUrl(invoiceUris[load.id] ?? load.invoiceUrl ?? null);
          const isInProgressLoad = load.status === 'DRAFT';
          const canSubmitInvoice =
            tripStatus === 'IN_PROGRESS' && isInProgressLoad && !submittingTrip;
          const canCancel = tripStatus === 'IN_PROGRESS' && isInProgressLoad && !submittingTrip;
          const statusColors = formatStatusColors(load.status);

            return (
              <View key={load.id} style={styles.loadCard}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => handleOpenLoad(load)}>
                <View style={styles.loadCardTop}>
                  <View>
                    <Text style={styles.loadTitle}>Load #{load.id}</Text>
                    <Text style={styles.loadMeta}>
                      {load.productType} - {load.totalQuantity} cyl
                    </Text>
                  </View>

                  <View style={[styles.pendingPill, { backgroundColor: statusColors.bg }]}>
                    <Text style={[styles.pendingText, { color: statusColors.text }]}>{statusColors.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.itemList}>
                {load.items?.length ? (
                  load.items.map((item) => (
                    <View key={`${load.id}-${item.productId}`} style={styles.itemRow}>
                      <View>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemCategory}>{item.category}</Text>
                      </View>

                      <Text style={styles.itemQty}>{item.quantity}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.itemRow}>
                    <Text style={styles.itemName}>Total Cylinders</Text>
                    <Text style={styles.itemQty}>{load.totalQuantity}</Text>
                  </View>
                )}
              </View>

              <View style={styles.invoiceRow}>
                <View style={styles.invoicePreviewBox}>
                  {invoiceUri ? (
                    <Image source={{ uri: invoiceUri }} style={styles.invoicePreview} />
                  ) : (
                    <View style={styles.invoicePlaceholder}>
                      <Ionicons name="document-text-outline" size={24} color={DS.textTertiary} />
                      <Text style={styles.invoicePlaceholderText}>NO INVOICE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.invoiceButtons}>
                  <TouchableOpacity
                    style={styles.invoiceActionButton}
                    disabled={tripStatus !== 'IN_PROGRESS' || !isInProgressLoad}
                    onPress={() => handlePickInvoice(load.id, 'camera')}
                  >
                    <Ionicons name="camera-outline" size={16} color={DS.textPrimary} />
                    <Text style={styles.invoiceActionText}>Capture</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.invoiceActionButton}
                    disabled={tripStatus !== 'IN_PROGRESS' || !isInProgressLoad}
                    onPress={() => handlePickInvoice(load.id, 'gallery')}
                  >
                    <Ionicons name="images-outline" size={16} color={DS.textPrimary} />
                    <Text style={styles.invoiceActionText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.cancelButton, !canCancel ? styles.cancelButtonDisabled : null]}
                  disabled={!canCancel || cancellingLoadId === load.id}
                  onPress={() => handleCancelLoad(load.id)}
                >
                  <Ionicons name="close" size={16} color={DS.red} />
                  <Text style={styles.cancelText}>
                    {cancellingLoadId === load.id ? 'Cancelling...' : 'Cancel'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  style={[
                    styles.submitApprovalButton,
                    !canSubmitInvoice || submittingInvoiceLoadId === load.id
                      ? styles.submitApprovalButtonDisabled
                      : null,
                  ]}
                  disabled={!canSubmitInvoice || submittingInvoiceLoadId === load.id}
                  onPress={() => handleSubmitInvoice(load.id)}
                >
                  <Ionicons name="checkmark" size={16} color={DS.white} />
                  <Text style={styles.submitApprovalText}>
                    {submittingInvoiceLoadId === load.id ? 'Submitting...' : 'Submit for Approval'}
                  </Text>
                </TouchableOpacity>
              </View>
              </View>
          );
        })}

        {!loads.length ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyText}>No loads added yet for this trip.</Text>
            {tripStatus === 'IN_PROGRESS' ? (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.emptyActionButton}
                onPress={handleAddLoad}
              >
                <Ionicons name="add" size={16} color={DS.white} />
                <Text style={styles.emptyActionText}>Create First Load</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.endTripButton,
            !canEndTrip || submittingTrip ? styles.endTripButtonDisabled : null,
          ]}
          disabled={!canEndTrip || submittingTrip}
          onPress={handleSubmitTrip}
        >
          <Text style={styles.endTripText}>
            {submittingTrip ? 'Submitting Trip...' : 'End Trip'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={endTripModalVisible}
        onRequestClose={() => setEndTripModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>End Trip</Text>
              <TouchableOpacity onPress={() => setEndTripModalVisible(false)}>
                <Ionicons name="close" size={20} color={DS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>LATEST ODOMETER PHOTO</Text>

            <View style={styles.endImagePreviewBox}>
              {endOdometerImageUri ? (
                <Image source={{ uri: endOdometerImageUri }} style={styles.endImagePreview} />
              ) : (
                <View style={styles.endImagePlaceholder}>
                  <Ionicons name="speedometer-outline" size={24} color={DS.textTertiary} />
                  <Text style={styles.endImagePlaceholderText}>ATTACH END ODOMETER PHOTO</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => handlePickTripEndImage('camera')}
              >
                <Ionicons name="camera-outline" size={16} color={DS.textPrimary} />
                <Text style={styles.modalSecondaryText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryButton}
                onPress={() => handlePickTripEndImage('gallery')}
              >
                <Ionicons name="images-outline" size={16} color={DS.textPrimary} />
                <Text style={styles.modalSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>END ODOMETER READING (KM)</Text>
            <TextInput
              value={endOdometerReading}
              onChangeText={setEndOdometerReading}
              keyboardType="number-pad"
              placeholder="Enter end KM"
              placeholderTextColor="#9CA3AF"
              style={styles.odometerInput}
            />

            <TouchableOpacity
              activeOpacity={0.88}
              style={[
                styles.modalPrimaryButton,
                !endOdometerImageUri || !endOdometerReading || submittingTrip
                  ? styles.modalPrimaryButtonDisabled
                  : null,
              ]}
              disabled={!endOdometerImageUri || !endOdometerReading || submittingTrip}
              onPress={handleConfirmTripSubmit}
            >
              <Text style={styles.modalPrimaryText}>
                {submittingTrip ? 'Submitting Trip...' : 'Submit Trip for Approval'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    backgroundColor: DS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  screen: {
    flex: 1,
    backgroundColor: DS.background,
  },
  headerCard: {
    backgroundColor: PALETTE.black,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  tripLabel: {
    ...EYEBROW,
    color: DS.grey400,
    letterSpacing: 0.8,
  },
  tripValue: {
    ...TYPO.h5,
    color: DS.white,
    marginTop: 4,
  },
  progressPill: {
    backgroundColor: DS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressText: {
    ...TYPO.c3,
    color: DS.white,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.4,
  },
  content: {
    flex: 1,
  },
  contentBody: {
    padding: 16,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    ...EYEBROW,
    color: DS.textSecondary,
    letterSpacing: 0.8,
  },
  inlineAddButton: {
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: DS.primary,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineAddButtonDisabled: {
    backgroundColor: PALETTE.primary200,
  },
  inlineAddText: {
    ...TYPO.c2,
    color: DS.white,
  },
  loadCard: {
    backgroundColor: DS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: DS.border,
    padding: 16,
    marginBottom: 12,
  },
  loadCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  loadTitle: {
    ...TYPO.s1,
    color: DS.textPrimary,
  },
  loadMeta: {
    ...TYPO.c1,
    color: DS.textSecondary,
    marginTop: 2,
  },
  pendingPill: {
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pendingText: {
    ...TYPO.c3,
    fontWeight: WEIGHT.semibold,
    letterSpacing: 0.4,
  },
  itemList: {
    marginTop: 14,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  itemCategory: {
    ...TYPO.c1,
    color: DS.textSecondary,
    marginTop: 2,
  },
  itemQty: {
    ...TYPO.s1,
    color: DS.textPrimary,
  },
  invoiceRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  invoicePreviewBox: {
    flex: 1,
    minHeight: 94,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.surface,
    overflow: 'hidden',
  },
  invoicePlaceholder: {
    minHeight: 94,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoicePlaceholderText: {
    ...EYEBROW,
    color: DS.textTertiary,
    fontSize: 10,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  invoicePreview: {
    width: '100%',
    height: 110,
  },
  invoiceButtons: {
    width: 118,
    gap: 10,
  },
  invoiceActionButton: {
    flex: 1,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  invoiceActionText: {
    ...TYPO.c2,
    color: DS.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cancelButtonDisabled: {
    opacity: 0.45,
  },
  cancelText: {
    ...TYPO.b4,
    color: DS.red,
    fontWeight: WEIGHT.semibold,
  },
  submitApprovalButton: {
    flex: 1.2,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: DS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  submitApprovalButtonDisabled: {
    backgroundColor: PALETTE.primary200,
  },
  submitApprovalText: {
    ...TYPO.b4,
    color: DS.white,
    fontWeight: WEIGHT.semibold,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: DS.border,
  },
  endTripButton: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: DS.card,
    borderWidth: 1,
    borderColor: DS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endTripButtonDisabled: {
    opacity: 0.55,
  },
  endTripText: {
    ...TYPO.s2,
    color: DS.textPrimary,
  },
  emptyStateCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.card,
    padding: 16,
    alignItems: 'center',
  },
  emptyActionButton: {
    marginTop: 12,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: DS.primary,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyActionText: {
    ...TYPO.b4,
    color: DS.white,
    fontWeight: WEIGHT.semibold,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,13,18,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: DS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 16,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    ...TYPO.h5,
    color: DS.textPrimary,
  },
  modalLabel: {
    ...EYEBROW,
    color: DS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  endImagePreviewBox: {
    minHeight: 180,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.surface,
    overflow: 'hidden',
  },
  endImagePreview: {
    width: '100%',
    height: 220,
  },
  endImagePlaceholder: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endImagePlaceholderText: {
    ...EYEBROW,
    color: DS.textTertiary,
    letterSpacing: 0.6,
    marginTop: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 18,
  },
  modalSecondaryButton: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalSecondaryText: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  odometerInput: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.surface,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: WEIGHT.semibold,
    color: DS.textPrimary,
    marginBottom: 12,
  },
  modalPrimaryButton: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: DS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: PALETTE.primary200,
  },
  modalPrimaryText: {
    ...TYPO.s2,
    color: DS.white,
  },
});