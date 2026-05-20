import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AppHeader from "../components/common/AppHeader";
import ScreenContainer from "../components/common/ScreenContainer";
import ConfirmDeliveryModal from "../components/ui/ConfirmDeliveryModal";
import DeliveryCard from "../components/ui/DeliveryCard";
import StatCard from "../components/ui/StatCard";
import { COLORS } from "../constants/colors";
import api from "../services/api";
import { DriverDeliveriesResponse, DriverDeliveryItem } from "../types";

const DRIVER_ID = 2;

type FinderMode = "QR" | "NUMBER";

type FoundCustomer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  productType?: string;
  quantity?: number;
};

type BatchItem = {
  allocationSaleId: number;
  allocationSalesItemId: number;
  batchNo: string;
  productId: number;
  productName: string;
  productType: "DOMESTIC" | "COMMERCIAL";
  productPrice: number;
  size?: string;
  totalAllocated: number;
  delivered: number;
  returned: number;
  defective: number;
  pending: number;
  allocatedAt: string;
};

const formatBatchType = (type?: string) => {
  if (type === "DOMESTIC") return "Domestic";
  if (type === "COMMERCIAL") return "Commercial";
  return type || "Domestic";
};

const formatSize = (batch: BatchItem) => {
  if (batch.size) return batch.size;
  const match = batch.productName?.match(/\d+\.?\d*\s?kg/i);
  return match?.[0] || "";
};

export default function DeliveriesScreen() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DriverDeliveriesResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"TODAY" | "COMMERCIAL">("TODAY");

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedSale, setSelectedSale] =
    useState<DriverDeliveryItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [finderVisible, setFinderVisible] = useState(false);
  const [finderMode, setFinderMode] = useState<FinderMode>("NUMBER");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [findingCustomer, setFindingCustomer] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);

  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);

  const [createSaleVisible, setCreateSaleVisible] = useState(false);
  const [createSaleLoading, setCreateSaleLoading] = useState(false);

  const [salePaymentMethod, setSalePaymentMethod] =
    useState<"CASH" | "UPI" | "ONLINE" | "CREDIT">("CASH");
  const [saleAmount, setSaleAmount] = useState("950");
  const [emptyCylinderQty, setEmptyCylinderQty] = useState(1);
  const [otp, setOtp] = useState("");

  const [permission, requestPermission] = useCameraPermissions();

  const fetchDeliveries = useCallback(async () => {
    try {
      setError("");

      const response = await api.get(`/drivers/${DRIVER_ID}/app-deliveries`);

      if (response.data?.success) {
        setDashboard(response.data.data);
      } else {
        setError("Failed to load deliveries");
      }
    } catch (err: any) {
      console.error("fetchDeliveries error:", err?.response?.data || err.message);
      setError("Failed to load deliveries");
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDeliveries();
      setLoading(false);
    };

    load();
  }, [fetchDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries();
    setRefreshing(false);
  };

  const handleOpenConfirm = (item: DriverDeliveryItem) => {
    setSelectedSale(item);
    setConfirmVisible(true);
  };

  const handleConfirmDelivery = async (payload: {
    payment_method: "CASH" | "UPI" | "ONLINE" | "CREDIT";
    empty_cylinder_qty: number;
  }) => {
    if (!selectedSale) return;

    try {
      setConfirmLoading(true);

      await api.put(`/drivers/sale/${selectedSale.saleId}/deliver`, {
        payment_method: payload.payment_method,
        empty_cylinder_qty: payload.empty_cylinder_qty,
        empty_product_id: 8,
        stock_area_id: 1,
        created_by: 7,
      });

      setConfirmVisible(false);
      setSelectedSale(null);
      await fetchDeliveries();
    } catch (err: any) {
      console.error("Confirm delivery error:", err?.response?.data || err.message);
      Alert.alert("Error", err?.response?.data?.message || "Failed to confirm");
    } finally {
      setConfirmLoading(false);
    }
  };

  const resetCreateSaleForm = () => {
    setSalePaymentMethod("CASH");
    setSaleAmount("950");
    setEmptyCylinderQty(1);
    setOtp("");
    setSelectedBatch(null);
    setAvailableBatches([]);
  };

  const handleOpenFinder = () => {
    setFinderVisible(true);
    setFinderMode("NUMBER");
    setConsumerNumber("");
    setScanned(false);
  };

  const handleCloseFinder = () => {
    setFinderVisible(false);
    setConsumerNumber("");
    setScanned(false);
    Keyboard.dismiss();
  };

  const handleSwitchFinderMode = async (mode: FinderMode) => {
    setFinderMode(mode);
    setScanned(false);

    if (mode === "QR" && !permission?.granted) {
      await requestPermission();
    }
  };

  const fetchAvailableBatches = async () => {
    try {
      setBatchLoading(true);

      const response = await api.get(`/drivers/${DRIVER_ID}/available-batches`);

      if (response.data?.success) {
        setAvailableBatches(response.data.data || []);
      } else {
        setAvailableBatches([]);
      }
    } catch (err: any) {
      console.error(
        "fetchAvailableBatches error:",
        err?.response?.data || err.message
      );
      setAvailableBatches([]);
    } finally {
      setBatchLoading(false);
    }
  };

  const handleFindCustomer = async (value?: string) => {
    const searchValue = (value || consumerNumber).trim();

    if (!searchValue) {
      Alert.alert("Required", "Please enter consumer number or phone number");
      return;
    }

    try {
      setFindingCustomer(true);

      const response = await api.get(
        `/drivers/customers/find?query=${encodeURIComponent(searchValue)}`
      );

      if (response.data?.success && response.data?.data) {
        const customer = response.data.data;

        setFoundCustomer({
          id: Number(customer.id),
          name: customer.name || "",
          phone: customer.phone || "",
          address: customer.address || "",
          productType: customer.productType || customer.type || "Domestic",
          quantity: Number(customer.quantity || 1),
        });

        handleCloseFinder();
        resetCreateSaleForm();

        await fetchAvailableBatches();
        setBatchModalVisible(true);
      } else {
        Alert.alert("Not found", response.data?.message || "Customer not found");
      }
    } catch (err: any) {
      console.error("handleFindCustomer error:", err?.response?.data || err.message);
      Alert.alert("Error", err?.response?.data?.message || "Customer not found");
    } finally {
      setFindingCustomer(false);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    setScanned(true);
    setConsumerNumber(data);
    handleFindCustomer(data);

    setTimeout(() => {
      setScanned(false);
    }, 1500);
  };

  const handleBatchSelect = (batch: BatchItem) => {
    setSelectedBatch(batch);
    setSaleAmount(String(batch.productPrice || 0));
    setBatchModalVisible(false);
    setCreateSaleVisible(true);
  };

  const handleCreateSaleFromCustomer = async () => {
    if (!foundCustomer) return;

    if (!selectedBatch) {
      Alert.alert("Required", "Please select batch");
      return;
    }

    if (otp.length !== 4) {
      Alert.alert("Required", "Please enter 4 digit OTP");
      return;
    }

    try {
      setCreateSaleLoading(true);

      const orderedQty = 1;

      if (selectedBatch.pending < orderedQty) {
        Alert.alert("Error", "Selected batch does not have enough cylinders");
        return;
      }

      const emptyCylinderStatus =
        emptyCylinderQty === 0
          ? "PENDING"
          : emptyCylinderQty === orderedQty
          ? "DELIVERED"
          : "PARTIAL_PENDING";

      await api.post("/drivers/sales", {
        driver_id: DRIVER_ID,
        customer_name: foundCustomer.name,
        phone: foundCustomer.phone,
        address: foundCustomer.address,

        cylinder_type: selectedBatch.productType,
        product_id: selectedBatch.productId,
        quantity: orderedQty,

        payment_method: salePaymentMethod,
        amount: Number(saleAmount),

        empty_cylinder_collected: emptyCylinderQty > 0,
        delivered_qty: orderedQty,
        empty_cylinder_qty: Number(emptyCylinderQty || 0),
        empty_cylinder_status: emptyCylinderStatus,
        defective_qty: 0,

        allocation_sale_id: selectedBatch.allocationSaleId,
        allocation_sales_item_id: selectedBatch.allocationSalesItemId,
        batch_no: selectedBatch.batchNo,
      });

      setCreateSaleVisible(false);
      setFoundCustomer(null);
      resetCreateSaleForm();
      await fetchDeliveries();

      Alert.alert("Success", "Sale created successfully");
    } catch (err: any) {
      console.error(
        "handleCreateSaleFromCustomer error:",
        err?.response?.data || err.message
      );
      Alert.alert("Error", err?.response?.data?.message || "Failed to create sale");
    } finally {
      setCreateSaleLoading(false);
    }
  };

  const statCards = useMemo(() => {
    return [
      {
        id: 1,
        title: "Allocated",
        value: String(dashboard?.stats?.allocated ?? 0),
        icon: "cube-outline",
        tone: "blue" as const,
        onPress: () => router.push("/allocated-cylinders"),
      },
      {
        id: 2,
        title: "Delivered",
        value: String(dashboard?.stats?.delivered ?? 0),
        icon: "checkmark-circle-outline",
        tone: "green" as const,
        onPress: () => router.push("/delivered-cylinders"),
      },
      {
        id: 3,
        title: "Collection",
        value: `₹${dashboard?.stats?.collection ?? 0}`,
        icon: "wallet-outline",
        tone: "orange" as const,
        onPress: () => router.push("/collection"),
      },
      {
        id: 4,
        title: "Empties",
        value: String(dashboard?.stats?.empties ?? 0),
        icon: "refresh-circle-outline",
        tone: "red" as const,
        onPress: () => router.push("/empty-cylinders"),
      },
      {
        id: 5,
        title: "In Hand",
        value: String(dashboard?.stats?.inHand ?? 0),
        icon: "cube-outline",
        tone: "green" as const,
        onPress: () => router.push("/in-hand-cylinders"),
      },
      {
        id: 6,
        title: "System Stock",
        value: String(dashboard?.stats?.newDelivery ?? 0),
        icon: "cube-outline",
        tone: "blue" as const,
      },
    ];
  }, [dashboard, router]);

  const filteredDeliveries = useMemo(() => {
    const deliveries = dashboard?.deliveries || [];

    if (activeTab === "COMMERCIAL") {
      return deliveries.filter((item) => item.cylinderType === "COMMERCIAL");
    }

    return deliveries;
  }, [dashboard, activeTab]);

  return (
    <View style={styles.screenRoot}>
      <ScreenContainer
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <AppHeader />

        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.infoText}>Loading deliveries...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={fetchDeliveries}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.grid}>
                {statCards.map((item) => (
                  <StatCard
                    key={item.id}
                    title={item.title}
                    value={item.value}
                    icon={item.icon as any}
                    tone={item.tone}
                    onPress={item.onPress}
                  />
                ))}
              </View>

              <View style={styles.segmentWrap}>
                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    activeTab === "TODAY" && styles.segmentTabActive,
                  ]}
                  onPress={() => setActiveTab("TODAY")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      activeTab === "TODAY" && styles.segmentTextActive,
                    ]}
                  >
                    Today's Deliveries
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentTab,
                    activeTab === "COMMERCIAL" && styles.segmentTabActive,
                  ]}
                  onPress={() => setActiveTab("COMMERCIAL")}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      activeTab === "COMMERCIAL" && styles.segmentTextActive,
                    ]}
                  >
                    Commercial
                  </Text>
                </TouchableOpacity>
              </View>

              {filteredDeliveries.length ? (
                filteredDeliveries.map((item) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => router.push(`/delivery/${item.saleId}`)}
                    key={item.saleId}
                  >
                    <DeliveryCard
                      name={item.customerName}
                      address={item.address}
                      type={item.product}
                      qty={item.quantity}
                      status={item.status}
                      showMarkDelivered={item.showMarkDelivered}
                      onMarkDelivered={() => handleOpenConfirm(item)}
                    />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.infoText}>
                    {activeTab === "COMMERCIAL"
                      ? "No commercial deliveries found"
                      : "No deliveries found"}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        <ConfirmDeliveryModal
          visible={confirmVisible}
          onClose={() => {
            setConfirmVisible(false);
            setSelectedSale(null);
          }}
          onSubmit={handleConfirmDelivery}
          loading={confirmLoading}
          sale={
            selectedSale
              ? {
                  customerName: selectedSale.customerName,
                  address: selectedSale.address,
                  product: selectedSale.product,
                  quantity: selectedSale.quantity,
                  totalAmount: selectedSale.totalAmount,
                }
              : null
          }
        />
      </ScreenContainer>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.scannerFab}
        onPress={handleOpenFinder}
      >
        <Ionicons name="scan-outline" size={34} color={COLORS.white} />
      </TouchableOpacity>

      <FindCustomerModal
        visible={finderVisible}
        finderMode={finderMode}
        consumerNumber={consumerNumber}
        findingCustomer={findingCustomer}
        permission={permission}
        scanned={scanned}
        onClose={handleCloseFinder}
        onModeChange={handleSwitchFinderMode}
        onConsumerNumberChange={setConsumerNumber}
        onFind={() => handleFindCustomer()}
        onBarcodeScanned={handleBarcodeScanned}
        requestPermission={requestPermission}
      />

      <BatchSelectionModal
        visible={batchModalVisible}
        loading={batchLoading}
        customer={foundCustomer}
        batches={availableBatches}
        onBack={() => {
          setBatchModalVisible(false);
          setFinderVisible(true);
        }}
        onClose={() => setBatchModalVisible(false)}
        onSelect={handleBatchSelect}
        onSkip={() => {
          setSelectedBatch(null);
          setBatchModalVisible(false);
          Alert.alert("Required", "Please select a batch to continue");
        }}
      />

      <ConfirmNewSaleModal
        visible={createSaleVisible}
        customer={foundCustomer}
        batch={selectedBatch}
        paymentMethod={salePaymentMethod}
        amount={saleAmount}
        emptyCylinderQty={emptyCylinderQty}
        otp={otp}
        loading={createSaleLoading}
        onClose={() => setCreateSaleVisible(false)}
        onPaymentMethodChange={setSalePaymentMethod}
        onAmountChange={setSaleAmount}
        onEmptyMinus={() => setEmptyCylinderQty((prev) => Math.max(0, prev - 1))}
        onEmptyPlus={() => setEmptyCylinderQty((prev) => prev + 1)}
        onOtpChange={setOtp}
        onSubmit={handleCreateSaleFromCustomer}
      />
    </View>
  );
}

function FindCustomerModal({
  visible,
  finderMode,
  consumerNumber,
  findingCustomer,
  permission,
  scanned,
  onClose,
  onModeChange,
  onConsumerNumberChange,
  onFind,
  onBarcodeScanned,
  requestPermission,
}: {
  visible: boolean;
  finderMode: FinderMode;
  consumerNumber: string;
  findingCustomer: boolean;
  permission: any;
  scanned: boolean;
  onClose: () => void;
  onModeChange: (mode: FinderMode) => void;
  onConsumerNumberChange: (value: string) => void;
  onFind: () => void;
  onBarcodeScanned: ({ data }: { data: string }) => void;
  requestPermission: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.finderOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardView}
            >
              <View style={styles.finderSheet}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.finderScrollContent}
                >
                  <View style={styles.finderHandle} />

                  <View style={styles.finderHeader}>
                    <Text style={styles.finderTitle}>Find Customer</Text>

                    <TouchableOpacity onPress={onClose}>
                      <Ionicons
                        name="close-outline"
                        size={34}
                        color={COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.finderTabs}>
                    <TouchableOpacity
                      style={[
                        styles.finderTab,
                        finderMode === "QR" && styles.finderTabActive,
                      ]}
                      onPress={() => onModeChange("QR")}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={22}
                        color={finderMode === "QR" ? COLORS.white : COLORS.textPrimary}
                      />
                      <Text
                        style={[
                          styles.finderTabText,
                          finderMode === "QR" && styles.finderTabTextActive,
                        ]}
                      >
                        Scan QR
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.finderTab,
                        finderMode === "NUMBER" && styles.finderTabActive,
                      ]}
                      onPress={() => onModeChange("NUMBER")}
                    >
                      <Ionicons
                        name="search-outline"
                        size={24}
                        color={
                          finderMode === "NUMBER"
                            ? COLORS.white
                            : COLORS.textPrimary
                        }
                      />
                      <Text
                        style={[
                          styles.finderTabText,
                          finderMode === "NUMBER" && styles.finderTabTextActive,
                        ]}
                      >
                        Enter Number
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {finderMode === "NUMBER" ? (
                    <View>
                      <Text style={styles.inputLabel}>Consumer Number / Phone</Text>

                      <TextInput
                        style={styles.consumerInput}
                        placeholder="e.g. 9876543210"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="phone-pad"
                        value={consumerNumber}
                        onChangeText={onConsumerNumberChange}
                      />

                      <TouchableOpacity
                        style={[
                          styles.findCustomerButton,
                          (!consumerNumber.trim() || findingCustomer) &&
                            styles.findCustomerButtonDisabled,
                        ]}
                        disabled={!consumerNumber.trim() || findingCustomer}
                        onPress={onFind}
                      >
                        {findingCustomer ? (
                          <ActivityIndicator color={COLORS.white} />
                        ) : (
                          <>
                            <Ionicons
                              name="search-outline"
                              size={24}
                              color={COLORS.white}
                            />
                            <Text style={styles.findCustomerButtonText}>
                              Find Customer
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cameraBlock}>
                      {!permission ? (
                        <View style={styles.permissionBox}>
                          <ActivityIndicator color={COLORS.primary} />
                          <Text style={styles.permissionText}>
                            Checking camera permission...
                          </Text>
                        </View>
                      ) : !permission.granted ? (
                        <View style={styles.permissionBox}>
                          <Text style={styles.permissionTitle}>
                            Camera permission needed
                          </Text>
                          <Text style={styles.permissionText}>
                            Please allow camera access to scan customer QR code.
                          </Text>
                          <TouchableOpacity
                            style={styles.permissionButton}
                            onPress={requestPermission}
                          >
                            <Text style={styles.permissionButtonText}>
                              Allow Camera
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                          <View style={styles.cameraPreview}>
                            <CameraView
                              style={StyleSheet.absoluteFillObject}
                              facing="back"
                              barcodeScannerSettings={{
                                barcodeTypes: ["qr"],
                              }}
                              onBarcodeScanned={
                                scanned ? undefined : onBarcodeScanned
                              }
                            />

                            <View style={styles.scanFrame}>
                              <View style={[styles.corner, styles.cornerTopLeft]} />
                              <View style={[styles.corner, styles.cornerTopRight]} />
                              <View
                                style={[styles.corner, styles.cornerBottomLeft]}
                              />
                              <View
                                style={[styles.corner, styles.cornerBottomRight]}
                              />
                            </View>
                          </View>

                          <Text style={styles.scanHelp}>
                            Point camera at the customer's QR code.
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function BatchSelectionModal({
  visible,
  loading,
  customer,
  batches,
  onBack,
  onClose,
  onSelect,
  onSkip,
}: {
  visible: boolean;
  loading: boolean;
  customer: FoundCustomer | null;
  batches: BatchItem[];
  onBack: () => void;
  onClose: () => void;
  onSelect: (batch: BatchItem) => void;
  onSkip: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.finderOverlay}>
        <View style={styles.batchSheet}>
          <View style={styles.finderHandle} />

          <View style={styles.batchHeader}>
            <TouchableOpacity onPress={onBack}>
              <Ionicons name="arrow-back" size={28} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.batchTitle}>Select Cylinder Batch</Text>

            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-outline" size={34} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.batchCustomerBox}>
            <Text style={styles.batchCustomerName}>{customer?.name || ""}</Text>
            <Text style={styles.batchCustomerMeta}>
              {customer?.phone || ""} · {customer?.productType || "Domestic"} · Qty{" "}
              {customer?.quantity || 1}
            </Text>
          </View>

          <Text style={styles.batchSubtitle}>
            Choose a batch to allocate for this delivery.
          </Text>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.infoText}>Loading batches...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {batches.map((batch) => (
                <TouchableOpacity
                  key={`${batch.batchNo}-${batch.allocationSalesItemId}`}
                  activeOpacity={0.85}
                  style={styles.batchCard}
                  onPress={() => onSelect(batch)}
                >
                  <View style={styles.batchIconBox}>
                    <Ionicons name="cube-outline" size={34} color={COLORS.primary} />
                  </View>

                  <View style={styles.batchInfoBox}>
                    <View style={styles.batchProductRow}>
                      <Text style={styles.batchProductName} numberOfLines={1}>
                        {batch.productName}
                      </Text>

                      <View style={styles.batchTypePill}>
                        <Text style={styles.batchTypeText}>
                          {formatBatchType(batch.productType)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.batchMetaText}>
                      {formatSize(batch)} · Batch {batch.batchNo}
                    </Text>

                    <Text style={styles.batchPendingText}>
                      Pending {batch.pending} of {batch.totalAllocated}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={30}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              ))}

              {!batches.length && (
                <View style={styles.emptyBox}>
                  <Text style={styles.infoText}>No available batch found</Text>
                </View>
              )}

              <TouchableOpacity style={styles.skipBatchButton} onPress={onSkip}>
                <Text style={styles.skipBatchText}>Skip batch selection</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ConfirmNewSaleModal({
  visible,
  customer,
  batch,
  paymentMethod,
  amount,
  emptyCylinderQty,
  otp,
  loading,
  onClose,
  onPaymentMethodChange,
  onAmountChange,
  onEmptyMinus,
  onEmptyPlus,
  onOtpChange,
  onSubmit,
}: {
  visible: boolean;
  customer: FoundCustomer | null;
  batch: BatchItem | null;
  paymentMethod: "CASH" | "UPI" | "ONLINE" | "CREDIT";
  amount: string;
  emptyCylinderQty: number;
  otp: string;
  loading: boolean;
  onClose: () => void;
  onPaymentMethodChange: (value: "CASH" | "UPI" | "ONLINE" | "CREDIT") => void;
  onAmountChange: (value: string) => void;
  onEmptyMinus: () => void;
  onEmptyPlus: () => void;
  onOtpChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.finderOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.confirmSaleSheet}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.confirmSaleScrollContent}
              >
                <View style={styles.finderHandle} />

                <View style={styles.finderHeader}>
                  <Text style={styles.finderTitle}>Confirm Delivery</Text>

                  <TouchableOpacity onPress={onClose}>
                    <Ionicons
                      name="close-outline"
                      size={34}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.customerPreviewBox}>
                  <Text style={styles.customerPreviewName}>
                    {customer?.name || ""}
                  </Text>

                  <View style={styles.customerAddressRow}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.customerPreviewAddress}>
                      {customer?.address || ""}
                    </Text>
                  </View>

                  <Text style={styles.customerPreviewMeta}>
                    {formatBatchType(batch?.productType)} · Qty: 1 ·{" "}
                    {customer?.phone || ""}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Payment Method</Text>

                <View style={styles.paymentRow}>
                  {(["CASH", "UPI", "ONLINE", "CREDIT"] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentButton,
                        paymentMethod === method && styles.paymentButtonActive,
                      ]}
                      onPress={() => onPaymentMethodChange(method)}
                    >
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMethod === method && styles.paymentButtonTextActive,
                        ]}
                      >
                        {method === "CASH"
                          ? "Cash"
                          : method === "UPI"
                          ? "UPI"
                          : method === "ONLINE"
                          ? "Online"
                          : "Credit"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Amount (₹)</Text>

                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={onAmountChange}
                />

                <Text style={styles.inputLabel}>Empty Cylinders Collected</Text>

                <View style={styles.emptyCounterRow}>
                  <TouchableOpacity style={styles.emptyCounterButton} onPress={onEmptyMinus}>
                    <Text style={styles.emptyCounterText}>-</Text>
                  </TouchableOpacity>

                  <View style={styles.emptyCounterValueBox}>
                    <Text style={styles.emptyCounterValue}>{emptyCylinderQty}</Text>
                  </View>

                  <TouchableOpacity style={styles.emptyCounterButton} onPress={onEmptyPlus}>
                    <Text style={styles.emptyCounterText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Customer OTP (4-digit)</Text>
                <Text style={styles.otpHelp}>
                  Ask the customer for the OTP sent to {customer?.phone || ""}.
                </Text>

                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={onOtpChange}
                />

                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    (otp.length !== 4 || !batch || loading) &&
                      styles.verifyButtonDisabled,
                  ]}
                  disabled={otp.length !== 4 || !batch || loading}
                  onPress={onSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={26}
                        color={COLORS.white}
                      />
                      <Text style={styles.verifyButtonText}>
                        Verify OTP & Save
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  finderScrollContent: {
    paddingBottom: 12,
  },
  keyboardView: {
    width: "100%",
    justifyContent: "flex-end",
  },
  screenRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#ECECEF",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentTab: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  segmentTabActive: {
    backgroundColor: COLORS.white,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.textPrimary,
  },
  centerBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: "#dc2626",
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
    fontWeight: "600",
  },
  emptyBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
  },
  scannerFab: {
    position: "absolute",
    right: 28,
    bottom: 86,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  finderOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end",
  },
  finderSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
  },
  finderHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 18,
  },
  finderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  finderTitle: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  finderTabs: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  finderTab: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  finderTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  finderTabText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  finderTabTextActive: {
    color: COLORS.white,
  },
  inputLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 14,
  },
  consumerInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 18,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: 18,
  },
  findCustomerButton: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  findCustomerButtonDisabled: {
    backgroundColor: "#8BB5F8",
  },
  findCustomerButtonText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.white,
  },
  cameraBlock: {
    marginTop: -4,
  },
  cameraPreview: {
    height: 330,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111827",
  },
  scanFrame: {
    position: "absolute",
    left: "18%",
    right: "18%",
    top: 28,
    bottom: 86,
  },
  corner: {
    position: "absolute",
    width: 74,
    height: 74,
    borderColor: COLORS.white,
  },
  cornerTopLeft: {
    left: 0,
    top: 0,
    borderLeftWidth: 6,
    borderTopWidth: 6,
  },
  cornerTopRight: {
    right: 0,
    top: 0,
    borderRightWidth: 6,
    borderTopWidth: 6,
  },
  cornerBottomLeft: {
    left: 0,
    bottom: 0,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 6,
    borderBottomWidth: 6,
  },
  scanHelp: {
    textAlign: "center",
    fontSize: 17,
    color: COLORS.textSecondary,
    marginTop: 18,
    fontWeight: "600",
  },
  permissionBox: {
    height: 360,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontWeight: "800",
  },

  batchSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
    maxHeight: "88%",
  },
  batchHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  batchTitle: {
    flex: 1,
    marginLeft: 18,
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  batchCustomerBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  batchCustomerName: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  batchCustomerMeta: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  batchSubtitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 18,
  },
  batchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
  },
  batchIconBox: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  batchInfoBox: {
    flex: 1,
  },
  batchProductRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  batchProductName: {
    fontSize: 18,
    fontWeight: "900",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  batchTypePill: {
    backgroundColor: "#F1F1F2",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  batchTypeText: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.textSecondary,
  },
  batchMetaText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  batchPendingText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  skipBatchButton: {
    height: 70,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  skipBatchText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  confirmSaleSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    maxHeight: "88%",
  },
  confirmSaleScrollContent: {
    paddingBottom: 24,
  },
  customerPreviewBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
  },
  customerPreviewName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  customerAddressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  customerPreviewAddress: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: "700",
    flex: 1,
  },
  customerPreviewMeta: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  paymentRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  paymentButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    padding: 15,
  },
  paymentButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentButtonText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  paymentButtonTextActive: {
    color: COLORS.white,
  },
  amountInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 24,
    padding: 16,
  },
  emptyCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 26,
  },
  emptyCounterButton: {
    width: 86,
    height: 86,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCounterText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  emptyCounterValueBox: {
    flex: 1,
    height: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCounterValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },
  otpHelp: {
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontWeight: "700",
    marginTop: -6,
    marginBottom: 12,
  },
  otpInput: {
    alignSelf: "center",
    width: 220,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 18,
    color: COLORS.textPrimary,
    marginBottom: 26,
  },
  verifyButton: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: COLORS.buttonGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 12,
  },
  verifyButtonDisabled: {
    backgroundColor: "#9AD6AB",
  },
  verifyButtonText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    color: COLORS.white,
  },
});