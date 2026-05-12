import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  ScrollView,
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

type QtyValue = {
  empty: string;
  defective: string;
};

export default function GodownNewDispatchScreen() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [products, setProducts] = useState<any>({
    domestic: [],
    commercial: [],
  });

  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [erv, setErv] = useState('');
  const [quantities, setQuantities] = useState<Record<string, QtyValue>>({});
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

  const totalEmpty = allProducts.reduce((sum, item) => {
    const row = quantities[String(item.id)];
    return sum + Number(row?.empty || 0);
  }, 0);

  const totalDefective = allProducts.reduce((sum, item) => {
    const row = quantities[String(item.id)];
    return sum + Number(row?.defective || 0);
  }, 0);

  const grandTotal = totalEmpty + totalDefective;

  const updateQuantity = (
    productId: string | number,
    field: 'empty' | 'defective',
    value: string
  ) => {
    const cleanValue = value.replace(/[^0-9]/g, '');

    setQuantities((prev) => ({
      ...prev,
      [String(productId)]: {
        empty: prev[String(productId)]?.empty || '0',
        defective: prev[String(productId)]?.defective || '0',
        [field]: cleanValue || '0',
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!selectedDriver || grandTotal <= 0) return;

      setSubmitting(true);

      const items = allProducts
        .map((item) => {
          const row = quantities[String(item.id)];

          return {
            product_id: item.id,
            empty_quantity: Number(row?.empty || 0),
            defective_quantity: Number(row?.defective || 0),
          };
        })
        .filter(
          (item) => item.empty_quantity > 0 || item.defective_quantity > 0
        );

      await createStockOutLoad({
        driver_id: selectedDriver.id,
        reference_id: erv || Date.now(),
        items,
      });

      DeviceEventEmitter.emit('NEW_STOCK_OUT');
      DeviceEventEmitter.emit('NEW_DEFECTIVE');

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back to Loads</Text>
        </TouchableOpacity>

        <Text style={styles.label}>SELECT DRIVER</Text>

        <TouchableOpacity
          style={styles.input}
          activeOpacity={0.85}
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
          keyboardType="numeric"
        />

        <Text style={styles.label}>DOMESTIC</Text>

        <View style={styles.groupCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderItem}>ITEM</Text>
            <Text style={styles.tableHeaderQty}>EMPTY</Text>
            <Text style={styles.tableHeaderQty}>DEFECTIVE</Text>
          </View>

          {(products.domestic || []).map((item: any) => (
            <QtyRow
              key={item.id}
              label={item.name}
              value={quantities[String(item.id)] || { empty: '0', defective: '0' }}
              onChange={(field, value) =>
                updateQuantity(item.id, field, value)
              }
            />
          ))}
        </View>

        <Text style={styles.label}>COMMERCIAL</Text>

        <View style={styles.groupCard}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderItem}>ITEM</Text>
            <Text style={styles.tableHeaderQty}>EMPTY</Text>
            <Text style={styles.tableHeaderQty}>DEFECTIVE</Text>
          </View>

          {(products.commercial || []).map((item: any) => (
            <QtyRow
              key={item.id}
              label={item.name}
              value={quantities[String(item.id)] || { empty: '0', defective: '0' }}
              onChange={(field, value) =>
                updateQuantity(item.id, field, value)
              }
            />
          ))}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL EMPTIES</Text>
          <Text style={styles.totalValue}>{totalEmpty}</Text>
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>TOTAL DEFECTIVES</Text>
          <Text style={[styles.totalValue, styles.defectiveTotal]}>
            {totalDefective}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            grandTotal === 0 && styles.disabledButton,
          ]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={grandTotal === 0 || submitting}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />

          <Text style={styles.submitText}>
            {submitting ? 'Saving...' : 'Confirm the Return'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

function QtyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: QtyValue;
  onChange: (field: 'empty' | 'defective', value: string) => void;
}) {
  return (
    <View style={styles.qtyRow}>
      <Text style={styles.qtyLabel}>{label}</Text>

      <TextInput
        keyboardType="numeric"
        value={value.empty}
        onChangeText={(v) => onChange('empty', v)}
        style={styles.qtyInput}
      />

      <TextInput
        keyboardType="numeric"
        value={value.defective}
        onChangeText={(v) => onChange('defective', v)}
        style={[styles.qtyInput, styles.defectiveInput]}
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

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 140,
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
    paddingVertical: 9,
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

  tableHeader: {
    height: 38,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  tableHeaderItem: {
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },

  tableHeaderQty: {
    width: 94,
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  qtyRow: {
    minHeight: 72,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  qtyLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    flex: 1,
  },

  qtyInput: {
    width: 94,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },

  defectiveInput: {
    borderColor: '#FCA5A5',
    backgroundColor: '#F8FAFC',
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

  defectiveTotal: {
    color: '#EF4444',
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