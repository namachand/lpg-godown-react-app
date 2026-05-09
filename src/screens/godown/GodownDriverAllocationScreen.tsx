import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import {
  createDriverAllocation,
  getCylinderProducts,
} from '../../services/godownService';

export default function GodownDriverAllocationScreen() {
  const { id, name, allocated, delivered, empty, inHand } =
    useLocalSearchParams<{
      id?: string;
      name?: string;
      allocated?: string;
      delivered?: string;
      empty?: string;
      inHand?: string;
    }>();

  const [products, setProducts] = useState<any>({ domestic: [], commercial: [] });
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getCylinderProducts();
      setProducts(data || { domestic: [], commercial: [] });
    } catch (error) {
      console.log('Products error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const allProducts = useMemo(
    () => [...(products.domestic || []), ...(products.commercial || [])],
    [products]
  );

  const total = Object.values(quantities).reduce((sum, item) => sum + item, 0);

  const updateQty = (productId: number, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  };

  const handleConfirm = async () => {
    try {
      if (!id || total <= 0) return;

      setSubmitting(true);

      const items = allProducts
        .map((item: any) => ({
          product_id: item.id,
          quantity: quantities[item.id] || 0,
        }))
        .filter((item) => item.quantity > 0);

      await createDriverAllocation({
        driver_id: Number(id),
        items,
      });

      DeviceEventEmitter.emit('DRIVER_ALLOCATION_CREATED');
      router.back();
    } catch (error) {
      console.log('Create allocation error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View>
            <Text style={styles.driverName}>{name || 'Driver'}</Text>
            <Text style={styles.subText}>{inHand || 0} cylinders in hand</Text>
          </View>
        </View>

        <View style={styles.allocationHeader}>
          <Text style={styles.allocationTitle}>QUANTITY TO ALLOCATE</Text>
          <Text style={styles.totalText}>Total: {total}</Text>
        </View>

        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <>
            <Text style={styles.categoryTitle}>DOMESTIC</Text>

            {(products.domestic || []).map((item: any) => (
              <CylinderRow
                key={item.id}
                item={{
                  id: item.id,
                  title: item.name || 'Domestic',
                  subTitle: item.category || '',
                }}
                value={quantities[item.id] || 0}
                onMinus={() => updateQty(item.id, (quantities[item.id] || 0) - 1)}
                onPlus={() => updateQty(item.id, (quantities[item.id] || 0) + 1)}
              />
            ))}

            <Text style={styles.categoryTitle}>COMMERCIAL</Text>

            {(products.commercial || []).map((item: any) => (
              <CylinderRow
                key={item.id}
                item={{
                  id: item.id,
                  title: item.name || 'Commercial',
                  subTitle: item.category || '',
                }}
                value={quantities[item.id] || 0}
                onMinus={() => updateQty(item.id, (quantities[item.id] || 0) - 1)}
                onPlus={() => updateQty(item.id, (quantities[item.id] || 0) + 1)}
              />
            ))}
          </>
        )}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>DRIVER SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Summary value={allocated || '0'} label="Allocated" color={COLORS.primary} />
            <Summary value={delivered || '0'} label="Delivered" color={COLORS.green} />
            <Summary value={empty || '0'} label="Empty Collected" color={COLORS.textPrimary} />
            <Summary value={inHand || '0'} label="In-Hand" color={COLORS.orange} />
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.confirmButton, total === 0 && styles.confirmDisabled]}
          disabled={total === 0 || submitting}
          onPress={handleConfirm}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />
          <Text style={styles.confirmText}>
            {submitting ? 'Saving...' : 'Confirm Allocation'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function CylinderRow({ item, value, onMinus, onPlus }: any) {
  return (
    <View style={styles.cylinderRow}>
      <View style={styles.iconBox}>
        <Ionicons name="cube-outline" size={22} color={COLORS.textSecondary} />
      </View>

      <View style={styles.cylinderInfo}>
        <Text style={styles.cylinderTitle}>{item.title}</Text>
        <Text style={styles.cylinderSub}>{item.subTitle}</Text>
      </View>

      <View style={styles.qtyBox}>
        <TouchableOpacity onPress={onMinus}>
          <Ionicons name="remove" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <Text style={styles.qtyText}>{value}</Text>

        <TouchableOpacity onPress={onPlus}>
          <Ionicons name="add" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Summary({ value, label, color }: any) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 110 },
  loaderBox: { height: 220, alignItems: 'center', justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  driverName: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
  subText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  allocationTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  totalText: { fontSize: 12, fontWeight: '900', color: COLORS.textPrimary },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  cylinderRow: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cylinderInfo: { flex: 1 },
  cylinderTitle: { fontSize: 14, fontWeight: '900', color: COLORS.textPrimary },
  cylinderSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  qtyBox: {
    width: 96,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  qtyText: { fontSize: 18, fontWeight: '900', color: COLORS.textSecondary },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { fontSize: 18, fontWeight: '900' },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  confirmButton: {
    height: 58,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { fontSize: 16, fontWeight: '900', color: COLORS.white },
});