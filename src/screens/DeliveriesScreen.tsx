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
};

type ProductItem = {
  id: number;
  name: string;
  type: "DOMESTIC" | "COMMERCIAL";
  price: number;
};

export default function DeliveriesScreen() {
  const router = useRouter();

  const [dashboard, setDashboard] = useState<DriverDeliveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState<"TODAY" | "COMMERCIAL">("TODAY");

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<DriverDeliveryItem | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [finderVisible, setFinderVisible] = useState(false);
  const [finderMode, setFinderMode] = useState<FinderMode>("NUMBER");
  const [consumerNumber, setConsumerNumber] = useState("");
  const [findingCustomer, setFindingCustomer] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);
  const [createSaleVisible, setCreateSaleVisible] = useState(false);
  const [createSaleLoading, setCreateSaleLoading] = useState(false);

  const [salePaymentMethod, setSalePaymentMethod] =
    useState<"CASH" | "UPI" | "ONLINE" | "CREDIT">("CASH");
  const [saleAmount, setSaleAmount] = useState("950");
  const [emptyCylinderQty, setEmptyCylinderQty] = useState(1);
  const [otp, setOtp] = useState("");

  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productLoading, setProductLoading] = useState(false);

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
    } finally {
      setConfirmLoading(false);
    }
  };

  const resetCreateSaleForm = () => {
    setSalePaymentMethod("CASH");
    setSaleAmount("950");
    setEmptyCylinderQty(1);
    setOtp("");
    setProductSearch("");
    setSelectedProduct(null);
    setProducts([]);
    setShowProductDropdown(false);
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

  const fetchDomesticProducts = async (search = "") => {
    try {
      setProductLoading(true);

      const response = await api.get(
        `/drivers/products/search?type=DOMESTIC&search=${encodeURIComponent(search)}`
      );

      if (response.data?.success) {
        setProducts(response.data.data || []);
        setShowProductDropdown(true);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error("fetchDomesticProducts error:", err?.response?.data || err.message);
      setProducts([]);
    } finally {
      setProductLoading(false);
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
        });

        handleCloseFinder();
        resetCreateSaleForm();
        setCreateSaleVisible(true);
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

  const handleCreateSaleFromCustomer = async () => {
    if (!foundCustomer) return;

    if (!selectedProduct) {
      Alert.alert("Required", "Please select product");
      return;
    }

    if (otp.length !== 4) {
      Alert.alert("Required", "Please enter 4 digit OTP");
      return;
    }

    try {
      setCreateSaleLoading(true);

      const orderedQty = 1;

      const emptyCylinderStatus =
        emptyCylinderQty === 0
          ? 'PENDING'
          : emptyCylinderQty === orderedQty
            ? 'DELIVERED'
            : 'PARTIAL_PENDING';

      await api.post("/drivers/sales", {
        driver_id: DRIVER_ID,
        customer_name: foundCustomer.name,
        phone: foundCustomer.phone,
        address: foundCustomer.address,
        cylinder_type: "DOMESTIC",

        product_id: selectedProduct.id,

        quantity: orderedQty,

        payment_method: salePaymentMethod,

        amount: Number(saleAmount),

        empty_cylinder_collected: emptyCylinderQty > 0,

        delivered_qty: orderedQty,

        empty_cylinder_qty: Number(emptyCylinderQty || 0),

        empty_cylinder_status: emptyCylinderStatus,

        defective_qty: 0,
      });

      setCreateSaleVisible(false);
      setFoundCustomer(null);
      resetCreateSaleForm();
      await fetchDeliveries();

      Alert.alert("Success", "Sale created successfully");
    } catch (err: any) {
      console.error("handleCreateSaleFromCustomer error:", err?.response?.data || err.message);
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
              <TouchableOpacity style={styles.retryButton} onPress={fetchDeliveries}>
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

      <Modal
        visible={finderVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseFinder}
      >
        <TouchableWithoutFeedback onPress={handleCloseFinder}>
          <View style={styles.finderOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
              >
                <TouchableWithoutFeedback onPress={() => { }}>
                  <View style={styles.finderSheet}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.finderScrollContent}
                    >

                      <View >
                        <View style={styles.finderHandle} />

                        <View style={styles.finderHeader}>
                          <Text style={styles.finderTitle}>Find Customer</Text>

                          <TouchableOpacity onPress={handleCloseFinder}>
                            <Ionicons name="close-outline" size={30} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.finderTabs}>
                          <TouchableOpacity
                            style={[
                              styles.finderTab,
                              finderMode === "QR" && styles.finderTabActive,
                            ]}
                            onPress={() => handleSwitchFinderMode("QR")}
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
                            onPress={() => handleSwitchFinderMode("NUMBER")}
                          >
                            <Ionicons
                              name="search-outline"
                              size={24}
                              color={finderMode === "NUMBER" ? COLORS.white : COLORS.textPrimary}
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
                              onChangeText={setConsumerNumber}
                            />

                            <TouchableOpacity
                              style={[
                                styles.findCustomerButton,
                                (!consumerNumber.trim() || findingCustomer) &&
                                styles.findCustomerButtonDisabled,
                              ]}
                              disabled={!consumerNumber.trim() || findingCustomer}
                              onPress={() => handleFindCustomer()}
                            >
                              {findingCustomer ? (
                                <ActivityIndicator color={COLORS.white} />
                              ) : (
                                <>
                                  <Ionicons name="search-outline" size={24} color={COLORS.white} />
                                  <Text style={styles.findCustomerButtonText}>Find Customer</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.cameraBlock}>
                            {!permission ? (
                              <View style={styles.permissionBox}>
                                <ActivityIndicator color={COLORS.primary} />
                                <Text style={styles.permissionText}>Checking camera permission...</Text>
                              </View>
                            ) : !permission.granted ? (
                              <View style={styles.permissionBox}>
                                <Text style={styles.permissionTitle}>Camera permission needed</Text>
                                <Text style={styles.permissionText}>
                                  Please allow camera access to scan customer QR code.
                                </Text>
                                <TouchableOpacity
                                  style={styles.permissionButton}
                                  onPress={requestPermission}
                                >
                                  <Text style={styles.permissionButtonText}>Allow Camera</Text>
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
                                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                                  />

                                  <View style={styles.scanFrame}>
                                    <View style={[styles.corner, styles.cornerTopLeft]} />
                                    <View style={[styles.corner, styles.cornerTopRight]} />
                                    <View style={[styles.corner, styles.cornerBottomLeft]} />
                                    <View style={[styles.corner, styles.cornerBottomRight]} />
                                  </View>
                                </View>

                                <Text style={styles.scanHelp}>
                                  Point camera at the customer's QR code.
                                </Text>
                              </>
                            )}
                          </View>
                        )}
                      </View>

                    </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={createSaleVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateSaleVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCreateSaleVisible(false)}>
          <View style={styles.finderOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.confirmSaleSheet}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.confirmSaleScrollContent}
                >
                  <View style={styles.finderHandle} />

                  <View style={styles.finderHeader}>
                    <Text style={styles.finderTitle}>Confirm Delivery</Text>

                    <TouchableOpacity onPress={() => setCreateSaleVisible(false)}>
                      <Ionicons name="close-outline" size={34} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.customerPreviewBox}>
                    <Text style={styles.customerPreviewName}>
                      {foundCustomer?.name || ""}
                    </Text>

                    <View style={styles.customerAddressRow}>
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.customerPreviewAddress}>
                        {foundCustomer?.address || ""}
                      </Text>
                    </View>

                    <Text style={styles.customerPreviewMeta}>
                      {foundCustomer?.phone || ""}
                    </Text>
                  </View>

                  <Text style={styles.inputLabel}>Product</Text>

                  <View style={styles.productSearchBox}>
                    <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.productSearchInput}
                      placeholder="Search domestic product"
                      placeholderTextColor={COLORS.textSecondary}
                      value={productSearch}
                      onFocus={() => fetchDomesticProducts(productSearch)}
                      onChangeText={(text) => {
                        setProductSearch(text);
                        setSelectedProduct(null);
                        fetchDomesticProducts(text);
                      }}
                    />
                    {productLoading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : null}
                  </View>

                  {showProductDropdown && products.length > 0 ? (
                    <View style={styles.productDropdown}>
                      {products.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.productDropdownItem}
                          onPress={() => {
                            setSelectedProduct(item);
                            setProductSearch(item.name);
                            setSaleAmount(String(item.price || 0));
                            setShowProductDropdown(false);
                          }}
                        >
                          <Text style={styles.productDropdownName}>{item.name}</Text>
                          <Text style={styles.productDropdownPrice}>₹{item.price}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  <Text style={styles.inputLabel}>Payment Method</Text>

                  <View style={styles.paymentRow}>
                    {(["CASH", "UPI"] as const).map((method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.paymentButton,
                          salePaymentMethod === method && styles.paymentButtonActive,
                        ]}
                        onPress={() => setSalePaymentMethod(method)}
                      >
                        <Text
                          style={[
                            styles.paymentButtonText,
                            salePaymentMethod === method && styles.paymentButtonTextActive,
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
                    value={saleAmount}
                    onChangeText={setSaleAmount}
                  />

                  <Text style={styles.inputLabel}>Empty Cylinders Collected</Text>

                  <View style={styles.emptyCounterRow}>
                    <TouchableOpacity
                      style={styles.emptyCounterButton}
                      onPress={() => setEmptyCylinderQty((prev) => Math.max(0, prev - 1))}
                    >
                      <Text style={styles.emptyCounterText}>-</Text>
                    </TouchableOpacity>

                    <View style={styles.emptyCounterValueBox}>
                      <Text style={styles.emptyCounterValue}>{emptyCylinderQty}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.emptyCounterButton}
                      onPress={() => setEmptyCylinderQty((prev) => prev + 1)}
                    >
                      <Text style={styles.emptyCounterText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.inputLabel}>Customer OTP (4-digit)</Text>
                  <Text style={styles.otpHelp}>
                    Ask the customer for the OTP sent to {foundCustomer?.phone || ""}.
                  </Text>

                  <TextInput
                    style={styles.otpInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                  />

                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      (otp.length !== 4 || !selectedProduct || createSaleLoading) &&
                      styles.verifyButtonDisabled,
                    ]}
                    disabled={otp.length !== 4 || !selectedProduct || createSaleLoading}
                    onPress={handleCreateSaleFromCustomer}
                  >
                    {createSaleLoading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={26} color={COLORS.white} />
                        <Text style={styles.verifyButtonText}>Verify OTP & Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>



            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  finderTabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  finderTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  finderTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  finderTabText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  finderTabTextActive: {
    color: COLORS.white,
  },
  inputLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 12
  },
  consumerInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  findCustomerButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  findCustomerButtonDisabled: {
    backgroundColor: "#8BB5F8",
  },
  findCustomerButtonText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
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
  confirmSaleSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    maxHeight: "80%",
  },
  customerPreviewBox: {
    backgroundColor: "#F8F9FB",
    borderRadius: 14,
    padding: 18,
    marginBottom: 24,
  },
  customerPreviewName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
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
    lineHeight: 20,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  customerPreviewMeta: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  productSearchBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productSearchInput: {
    flex: 1,
    height: "100%",
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  productDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    marginBottom: 18,
  },
  productDropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  productDropdownName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  productDropdownPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
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
    padding: 12
  },
  paymentButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
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
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 24,
    padding: 12
  },
  emptyCounterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 26,
  },
  emptyCounterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCounterText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  emptyCounterValueBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 12
  },
  emptyCounterValue: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  otpHelp: {
    fontSize: 14,
    lineHeight: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginTop: -6,
    marginBottom: 12,
  },
  otpInput: {
    alignSelf: "center",
    paddingLeft: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 24,
    color: COLORS.textPrimary,
    marginBottom: 26,
  },
  verifyButton: {
    borderRadius: 16,
    backgroundColor: COLORS.buttonGreen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 12
  },
  verifyButtonDisabled: {
    backgroundColor: "#9AD6AB",
  },
  verifyButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "500",
    color: COLORS.white,
  },
  confirmSaleScrollContent: {
    paddingBottom: 24,
  },
});