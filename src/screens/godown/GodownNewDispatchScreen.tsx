import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import {
  createStockOutLoad,
  getCylinderProducts,
  getDriverLists,
} from '../../services/godownService';

export default function GodownNewDispatchScreen() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [products, setProducts] = useState<any>({
    domestic: [],
    commercial: [],
  });

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [erv, setErv] = useState('');
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      const [driverData, productData] = await Promise.all([
        getDriverLists(),
        getCylinderProducts(),
      ]);

      setDrivers(driverData || []);
      setProducts(productData || { domestic: [], commercial: [] });

      if (driverData?.length) {
        setSelectedDriver(driverData[0]);
      }
    } catch (error) {
      console.log('New dispatch initial data error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const allProducts = useMemo(
    () => [...(products.domestic || []), ...(products.commercial || [])],
    [products]
  );

  const total = allProducts.reduce((sum, item) => {
    return sum + Number(quantities[String(item.id)] || 0);
  }, 0);

  const handleSubmit = async () => {
    try {
      if (!selectedDriver || total <= 0) return;

      setSubmitting(true);

      const items = allProducts
        .map((item) => ({
          product_id: item.id,
          quantity: Number(quantities[String(item.id)] || 0),
        }))
        .filter((item) => item.quantity > 0);

      await createStockOutLoad({
        driver_id: selectedDriver.id,
        reference_id: erv || Date.now(),
        items,
      });

      DeviceEventEmitter.emit('NEW_STOCK_OUT');
      router.back();
    } catch (error) {
      console.log('Create stock out error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.loaderBox}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.topTabs}>
        <Text style={styles.inactiveTab}>Stock In</Text>
        <Text style={styles.activeTab}>Stock Out</Text>
        <Text style={styles.inactiveTab}>Defectives</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Loads</Text>
        </TouchableOpacity>

        <Text style={styles.label}>SELECT DRIVER</Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDriverDropdown((prev) => !prev)}
        >
          <Text style={styles.inputText}>
            {selectedDriver?.name || 'Select Driver'}
          </Text>
        </TouchableOpacity>

        {showDriverDropdown && (
          <View style={styles.dropdown}>
            {drivers.map((driver) => (
              <TouchableOpacity
                key={driver.id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedDriver(driver);
                  setShowDriverDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {selectedDriver?.id === driver.id ? '✓ ' : ''}
                  {driver.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>ERV NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 10-digit ERV number"
          placeholderTextColor="#94A3B8"
          value={erv}
          onChangeText={setErv}
        />

        <Text style={styles.label}>DOMESTIC</Text>
        <View style={styles.groupCard}>
          {(products.domestic || []).map((item: any) => (
            <QtyRow
              key={item.id}
              label={item.name}
              value={quantities[String(item.id)] || '0'}
              onChange={(v) =>
                setQuantities((prev) => ({
                  ...prev,
                  [String(item.id)]: v,
                }))
              }
            />
          ))}
        </View>

        <Text style={styles.label}>COMMERCIAL</Text>
        <View style={styles.groupCard}>
          {(products.commercial || []).map((item: any) => (
            <QtyRow
              key={item.id}
              label={item.name}
              value={quantities[String(item.id)] || '0'}
              onChange={(v) =>
                setQuantities((prev) => ({
                  ...prev,
                  [String(item.id)]: v,
                }))
              }
            />
          ))}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL EMPTIES</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, total === 0 && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={total === 0 || submitting}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />
          <Text style={styles.submitText}>
            {submitting ? 'Saving...' : 'Confirm the Return'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function QtyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.qtyRow}>
      <Text style={styles.qtyLabel}>{label}</Text>

      <TextInput
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
        style={styles.qtyInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loaderBox: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabs: {
    height: 44,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  activeTab: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '900',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 12,
  },
  inactiveTab: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    minHeight: 54,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dropdown: {
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    marginTop: 4,
    paddingVertical: 4,
    elevation: 4,
    zIndex: 20,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  qtyRow: {
    minHeight: 64,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    flex: 1,
  },
  qtyInput: {
    width: 112,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },
  totalBox: {
    marginTop: 18,
    height: 58,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  submitButton: {
    height: 58,
    backgroundColor: COLORS.green,
    borderRadius: 14,
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },
});