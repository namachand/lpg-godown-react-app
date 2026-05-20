// src/screens/AddDeliveryScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import AppHeader from "../components/common/AppHeader";
import ScreenContainer from "../components/common/ScreenContainer";
import { COLORS } from "../constants/colors";
import api from "../services/api";

const DRIVER_ID = 2;

type Customer = {
  id: number;
  name: string;
  phone: string;
  addressId: number | null;
  address: string;
};

type ProductItem = {
  id: number;
  name: string;
  type: "DOMESTIC" | "COMMERCIAL";
  price: number;
  categoryName?: string;
};

type BookingItem = ProductItem & {
  qty: number;
};

export default function AddDeliveryScreen() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [phone, setPhone] = useState("");
  const [checkingCustomer, setCheckingCustomer] = useState(false);
  const [customerExists, setCustomerExists] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [geoLocationTag, setGeoLocationTag] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [products, setProducts] = useState<BookingItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [creatingBooking, setCreatingBooking] = useState(false);

  const [cancelModalVisible, setCancelModalVisible] = useState(false);

  const findCustomer = async () => {
    const cleanPhone = phone.trim();

    if (!cleanPhone || cleanPhone.length < 10) {
      Alert.alert("Required", "Please enter valid phone number");
      return;
    }

    try {
      setCheckingCustomer(true);

      const response = await api.get(
        `/drivers/bookings/customer?phone=${encodeURIComponent(cleanPhone)}`
      );

      if (response.data?.success) {
        const exists = Boolean(response.data.data?.exists);

        setCustomerExists(exists);

        if (exists) {
          const customer = response.data.data.customer;

          setSelectedCustomer({
            id: Number(customer.id),
            name: customer.name,
            phone: customer.phone,
            addressId: customer.addressId,
            address: customer.address || "",
          });
        } else {
          setSelectedCustomer(null);
          setName("");
          setAddress("");
          setGeoLocationTag("");
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to find customer"
      );
    } finally {
      setCheckingCustomer(false);
    }
  };

  useEffect(() => {
    if (phone.trim().length === 10) {
      findCustomer();
    } else {
      setCustomerExists(false);
      setSelectedCustomer(null);
    }
  }, [phone]);

  const continueFromStepOne = async () => {
    if (!phone.trim() || phone.trim().length < 10) {
      Alert.alert("Required", "Please enter valid phone number");
      return;
    }

    if (customerExists && selectedCustomer) {
      await fetchCommercialProducts();
      setStep(3);
      return;
    }

    setStep(2);
  };

  const createCustomerAndContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Customer name is required");
      return;
    }

    if (!address.trim()) {
      Alert.alert("Required", "Address is required");
      return;
    }

    try {
      setCreatingCustomer(true);

      const response = await api.post("/drivers/bookings/customer", {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        geo_location_tag: geoLocationTag.trim(),
      });

      if (response.data?.success) {
        const customer = response.data.data.customer;

        setSelectedCustomer({
          id: Number(customer.id),
          name: customer.name,
          phone: customer.phone,
          addressId: customer.addressId,
          address: customer.address,
        });

        await fetchCommercialProducts();
        setStep(3);
      } else {
        Alert.alert("Error", response.data?.message || "Failed to create user");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to create customer"
      );
    } finally {
      setCreatingCustomer(false);
    }
  };

  const fetchCommercialProducts = async () => {
    try {
      setProductLoading(true);

      const response = await api.get(
        `/drivers/products/search?type=COMMERCIAL&search=`
      );

      if (response.data?.success) {
        const mapped = (response.data.data || []).map((item: ProductItem) => ({
          ...item,
          qty: 0,
        }));

        setProducts(mapped);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to fetch commercial products"
      );
      setProducts([]);
    } finally {
      setProductLoading(false);
    }
  };

  const updateQty = (productId: number, type: "PLUS" | "MINUS") => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;

        return {
          ...item,
          qty:
            type === "PLUS"
              ? item.qty + 1
              : Math.max(Number(item.qty || 0) - 1, 0),
        };
      })
    );
  };

  const selectedItems = products.filter((item) => item.qty > 0);

  const totalQty = selectedItems.reduce((sum, item) => sum + item.qty, 0);

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.qty * Number(item.price || 0),
    0
  );

  const canConfirmBooking = selectedCustomer && selectedItems.length > 0;

  const confirmBooking = async () => {
    if (!selectedCustomer) {
      Alert.alert("Required", "Customer is required");
      return;
    }

    if (!selectedCustomer.addressId) {
      Alert.alert("Required", "Customer address is required");
      return;
    }

    if (!selectedItems.length) {
      Alert.alert("Required", "Please select at least one cylinder");
      return;
    }

    try {
      setCreatingBooking(true);

      const response = await api.post("/drivers/bookings", {
        driver_id: DRIVER_ID,
        customer_id: selectedCustomer.id,
        address_id: selectedCustomer.addressId,
        items: selectedItems.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
        })),
      });

      if (response.data?.success) {
        Alert.alert("Success", "Booking created successfully");

        setStep(1);
        setPhone("");
        setCustomerExists(false);
        setSelectedCustomer(null);
        setName("");
        setAddress("");
        setGeoLocationTag("");
        setProducts([]);
      } else {
        Alert.alert("Error", response.data?.message || "Booking failed");
      }
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.response?.data?.message || "Failed to create booking"
      );
    } finally {
      setCreatingBooking(false);
    }
  };

  const customerBoxText = useMemo(() => {
    if (checkingCustomer) return "Checking customer...";
    if (customerExists && selectedCustomer) return selectedCustomer.name;
    if (phone.trim().length >= 10) return "New customer — let's add details";
    return "Enter phone number to search";
  }, [checkingCustomer, customerExists, selectedCustomer, phone]);

  return (
    <ScreenContainer>
      <AppHeader />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <Text style={styles.title}>New Booking</Text>
            <Text style={styles.stepText}>Step 1 of 3</Text>

            <View style={styles.phoneCard}>
              <View style={styles.labelRow}>
                <Ionicons
                  name="call-outline"
                  size={26}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.label}>Customer Phone Number</Text>
              </View>

              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="10-digit number"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={10}
              />

              <View
                style={[
                  styles.customerFoundBox,
                  customerExists
                    ? styles.customerFoundBoxGreen
                    : styles.customerFoundBoxBlue,
                ]}
              >
                <Ionicons
                  name={customerExists ? "person-add-outline" : "person-add-outline"}
                  size={28}
                  color={customerExists ? COLORS.green : COLORS.primary}
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.customerFoundTitle}>
                    {customerBoxText}
                  </Text>

                  {customerExists && selectedCustomer?.address ? (
                    <Text style={styles.customerFoundSub}>
                      {selectedCustomer.address}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={continueFromStepOne}
              disabled={checkingCustomer}
            >
              {checkingCustomer ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backSquare}
                onPress={() => setStep(1)}
              >
                <Ionicons
                  name="arrow-back"
                  size={28}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>

              <View>
                <Text style={styles.title}>New Booking</Text>
                <Text style={styles.stepText}>Step 2 of 3</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>Address *</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Delivery address"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.inputLabel}>Geo-Location Tag</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setGeoLocationTag("Current Location Tagged")}
            >
              <Ionicons
                name="location-outline"
                size={28}
                color={COLORS.textPrimary}
              />
              <Text style={styles.locationButtonText}>
                {geoLocationTag || "Tag Current Location"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!name.trim() || !address.trim()) && styles.disabledButton,
              ]}
              disabled={!name.trim() || !address.trim() || creatingCustomer}
              onPress={createCustomerAndContinue}
            >
              {creatingCustomer ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 3 && (
          <>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backSquare}
                onPress={() => {
                  if (customerExists) {
                    setStep(1);
                  } else {
                    setStep(2);
                  }
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={28}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>

              <View>
                <Text style={styles.title}>New Booking</Text>
                <Text style={styles.stepText}>Step 3 of 3</Text>
              </View>
            </View>

            <View style={styles.bookingForCard}>
              <Text style={styles.bookingForLabel}>Booking for</Text>
              <Text style={styles.bookingName}>{selectedCustomer?.name}</Text>
              <Text style={styles.bookingSub}>
                {selectedCustomer?.phone} · {selectedCustomer?.address}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Commercial Cylinders</Text>

            {productLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading products...</Text>
              </View>
            ) : (
              products.map((item) => (
                <View key={item.id} style={styles.productCard}>
                  <View>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productPrice}>
                      ₹{Number(item.price || 0)} / cyl
                    </Text>
                  </View>

                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQty(item.id, "MINUS")}
                    >
                      <Text style={styles.qtyButtonText}>-</Text>
                    </TouchableOpacity>

                    <Text style={styles.qtyText}>{item.qty}</Text>

                    <TouchableOpacity
                      style={styles.qtyButton}
                      onPress={() => updateQty(item.id, "PLUS")}
                    >
                      <Text style={styles.qtyButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total ({totalQty} cyl)</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toLocaleString("en-IN")}</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                !canConfirmBooking && styles.disabledGreenButton,
              ]}
              disabled={!canConfirmBooking || creatingBooking}
              onPress={confirmBooking}
            >
              {creatingBooking ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.confirmButtonText}>✓ Confirm Booking</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelBox}>
            <Text style={styles.cancelTitle}>Cancel this booking?</Text>
            <Text style={styles.cancelText}>
              This action cannot be undone. The booking will be marked as cancelled.
            </Text>

            <TouchableOpacity
              style={styles.cancelConfirmButton}
              onPress={() => setCancelModalVisible(false)}
            >
              <Text style={styles.cancelConfirmText}>Yes, Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.keepButton}
              onPress={() => setCancelModalVisible(false)}
            >
              <Text style={styles.keepButtonText}>Keep Booking</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  stepText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 28,
  },

  phoneCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    backgroundColor: COLORS.white,
    marginBottom: 28,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },

  label: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  phoneInput: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 18,
    paddingHorizontal: 22,
    height: 92,
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 18,
  },

  customerFoundBox: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },

  customerFoundBoxBlue: {
    backgroundColor: COLORS.blueSoft,
    borderColor: "#AFC8F7",
  },

  customerFoundBoxGreen: {
    backgroundColor: COLORS.greenSoft,
    borderColor: "#B7E0C1",
  },

  customerFoundTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  customerFoundSub: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: "700",
    marginTop: 4,
  },

  primaryButton: {
    height: 86,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: "900",
  },

  disabledButton: {
    backgroundColor: "#8FB3F4",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 28,
  },

  backSquare: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  inputLabel: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },

  input: {
    height: 86,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 22,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: 24,
  },

  locationButton: {
    height: 86,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginBottom: 24,
  },

  locationButtonText: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  bookingForCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 22,
    marginBottom: 30,
  },

  bookingForLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  bookingName: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginTop: 4,
  },

  bookingSub: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 14,
  },

  loadingBox: {
    padding: 30,
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },

  productCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    padding: 22,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  productName: {
    fontSize: 22,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginTop: 6,
  },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 22,
  },

  qtyButton: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },

  qtyButtonText: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
  },

  qtyText: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.textPrimary,
    minWidth: 30,
    textAlign: "center",
  },

  totalBox: {
    borderWidth: 1,
    borderColor: "#AFC8F7",
    borderRadius: 18,
    backgroundColor: "#F3F7FF",
    padding: 24,
    marginTop: 16,
    marginBottom: 28,
  },

  totalLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  totalAmount: {
    fontSize: 36,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginTop: 8,
  },

  confirmButton: {
    height: 88,
    borderRadius: 20,
    backgroundColor: COLORS.buttonGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 60,
  },

  disabledGreenButton: {
    backgroundColor: "#9AD6AB",
  },

  confirmButtonText: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.white,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
  },

  cancelBox: {
    backgroundColor: COLORS.white,
    padding: 28,
  },

  cancelTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: COLORS.textPrimary,
    textAlign: "center",
  },

  cancelText: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 30,
    marginTop: 22,
    marginBottom: 32,
  },

  cancelConfirmButton: {
    height: 86,
    backgroundColor: "#E05252",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  cancelConfirmText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "900",
  },

  keepButton: {
    height: 86,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  keepButtonText: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "900",
  },
});