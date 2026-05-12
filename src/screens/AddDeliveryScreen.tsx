import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AppHeader from '../components/common/AppHeader';
import ScreenContainer from '../components/common/ScreenContainer';
import { COLORS } from '../constants/colors';
import useDebounce from '../hooks/useDebounce';
import api from '../services/api';
import { ProductSearchItem } from '../types';

const DRIVER_ID = 2;

type CylinderType = 'DOMESTIC' | 'COMMERCIAL';
type PaymentMethod = 'CASH' | 'UPI' | 'ONLINE' | 'CREDIT';

export default function NewBookingScreen() {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cylinderType, setCylinderType] = useState<CylinderType>('DOMESTIC');
  const [searchText, setSearchText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState('950');
  const [emptyCylinderQty, setEmptyCylinderQty] = useState(0);
  const [products, setProducts] = useState<ProductSearchItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchItem | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debouncedSearch = useDebounce(searchText, 500);

  const fetchProducts = useCallback(async (type: CylinderType, search: string) => {
    try {
      setLoadingProducts(true);

      const response = await api.get(
        `/drivers/products/search?type=${type}&search=${encodeURIComponent(search)}`
      );

      if (response.data?.success) {
        setProducts(response.data.data || []);
        setShowDropdown(true);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error('fetchProducts error:', err?.response?.data || err.message);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    setSelectedProduct(null);
    setSearchText('');
    setProducts([]);
    setShowDropdown(false);
    fetchProducts(cylinderType, '');
  }, [cylinderType, fetchProducts]);

  useEffect(() => {
    fetchProducts(cylinderType, debouncedSearch);
  }, [debouncedSearch, cylinderType, fetchProducts]);

  const handleSelectProduct = (item: ProductSearchItem) => {
    setSelectedProduct(item);
    setSearchText(item.name);
    setAmount(String(item.price || 0));
    setShowDropdown(false);
    Keyboard.dismiss();
  };

  const dropdownData = useMemo(() => {
    return products;
  }, [products]);

  const handleSubmit = async () => {
    try {
      if (!customerName.trim()) {
        Alert.alert('Validation', 'Customer name is required');
        return;
      }

      if (!address.trim()) {
        Alert.alert('Validation', 'Address is required');
        return;
      }

      if (!selectedProduct) {
        Alert.alert('Validation', 'Please select a product');
        return;
      }

      setSubmitting(true);

      const emptyCylinderStatus =
        emptyCylinderQty === 0
          ? 'PENDING'
          : emptyCylinderQty === quantity
            ? 'DELIVERED'
            : 'PARTIAL_PENDING';

      const response = await api.post('/drivers/sales', {
        driver_id: DRIVER_ID,
        customer_name: customerName,
        phone,
        address,
        cylinder_type: cylinderType,

        product_id: selectedProduct.id,
        quantity,

        payment_method: paymentMethod,
        amount: Number(amount),

        empty_cylinder_collected: emptyCylinderQty > 0,

        delivered_qty: quantity,
        empty_cylinder_qty: Number(emptyCylinderQty || 0),
        empty_cylinder_status: emptyCylinderStatus,
        defective_qty: 0,
      });

      if (response.data?.success) {
        Alert.alert('Success', 'Delivery created successfully');

        setCustomerName('');
        setPhone('');
        setAddress('');
        setCylinderType('DOMESTIC');
        setSearchText('');
        setSelectedProduct(null);
        setQuantity(1);
        setPaymentMethod('CASH');
        setAmount('950');
        setEmptyCylinderQty(0);
        setProducts([]);
        setShowDropdown(false);
      } else {
        Alert.alert('Error', response.data?.message || 'Failed to create delivery');
      }
    } catch (err: any) {
      console.error('handleSubmit error:', err?.response?.data || err.message);
      Alert.alert(
        'Error',
        err?.response?.data?.message || 'Failed to create delivery'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
      <View style={{ flex: 1 }}>
        <ScreenContainer>
          <AppHeader />

          <View style={styles.content}>
            <Text style={styles.pageTitle}>New Delivery</Text>

            <Text style={styles.label}>Customer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              placeholderTextColor={COLORS.textSecondary}
              value={customerName}
              onChangeText={setCustomerName}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Delivery address"
              placeholderTextColor={COLORS.textSecondary}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Geo-Location Tag</Text>
            <TouchableOpacity style={styles.locationBtn}>
              <Ionicons name="location-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.locationText}>Tag Current Location</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Cylinder Type</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  cylinderType === 'DOMESTIC' && styles.activeTypeBtn,
                ]}
                onPress={() => setCylinderType('DOMESTIC')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cylinderType === 'DOMESTIC' && styles.activeTypeBtnText,
                  ]}
                >
                  Domestic
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  cylinderType === 'COMMERCIAL' && styles.activeTypeBtn,
                ]}
                onPress={() => setCylinderType('COMMERCIAL')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cylinderType === 'COMMERCIAL' && styles.activeTypeBtnText,
                  ]}
                >
                  Commercial
                </Text>
              </TouchableOpacity>
            </View>

            {/* NEW SEARCH BAR */}
            <Text style={styles.label}>Search Product</Text>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${cylinderType === 'DOMESTIC' ? 'domestic' : 'commercial'} product`}
                placeholderTextColor={COLORS.textSecondary}
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setSelectedProduct(null);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
              />
              {loadingProducts ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : null}
            </View>

            {showDropdown && dropdownData.length > 0 ? (
              <View style={styles.dropdown}>
                {dropdownData.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.dropdownItem,
                      index === dropdownData.length - 1 && styles.dropdownItemLast,
                    ]}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View>
                      <Text style={styles.dropdownName}>{item.name}</Text>
                      <Text style={styles.dropdownSub}>
                        {item.type} · ₹{item.price}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.label}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.qtyValue}>{quantity}</Text>

              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((prev) => prev + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentRow}>
              {(['CASH', 'UPI', 'ONLINE', 'CREDIT'] as PaymentMethod[]).map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentBtn,
                    paymentMethod === method && styles.activePaymentBtn,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Text
                    style={[
                      styles.paymentBtnText,
                      paymentMethod === method && styles.activePaymentBtnText,
                    ]}
                  >
                    {method === 'CASH'
                      ? 'Cash'
                      : method === 'UPI'
                        ? 'UPI'
                        : method === 'ONLINE'
                          ? 'Online'
                          : 'Credit'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Empty Cylinders Collected</Text>

            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setEmptyCylinderQty((prev) => Math.max(0, prev - 1))}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>

              <Text style={styles.qtyValue}>{emptyCylinderQty}</Text>

              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() =>
                  setEmptyCylinderQty((prev) => Math.min(quantity, prev + 1))
                }
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitBtnText}> Confirm Delivery</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScreenContainer>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 22,
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    height: 62,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    marginBottom: 18,
  },
  locationBtn: {
    height: 62,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    marginBottom: 18,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  typeBtn: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  activeTypeBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  inactiveWhiteBtn: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  typeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  activeTypeBtnText: {
    color: COLORS.white,
  },
  normalDark: {
    color: COLORS.textPrimary,
  },
  searchWrap: {
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    maxHeight: 180,
    marginBottom: 18,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dropdownSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 26,
    marginBottom: 18,
  },
  qtyBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  qtyBtnText: {
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    minWidth: 24,
    textAlign: 'center',
  },
  paymentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  paymentBtn: {
    minWidth: 96,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  activePaymentBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  activePaymentBtnText: {
    color: COLORS.white,
  },
  submitBtn: {
    height: 58,
    borderRadius: 16,
    backgroundColor: COLORS.buttonGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.white,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  inactiveTypeBtnText: {
    color: COLORS.textPrimary,
  },
});