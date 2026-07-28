import { Ionicons } from '@expo/vector-icons';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { DS, TYPO, EYEBROW, RADIUS, PALETTE, WEIGHT } from '../../constants/designSystem';
import {
  createPurchaseLoad,
  getPurchaseBootstrap,
  getPurchaseLoadDetail,
  updatePurchaseLoad,
} from '../../services/purchaseService';
import type { PurchaseBootstrap, PurchaseProduct } from '../../types';

type CounterMap = Record<number, number>;

type ProductSection = {
  title: string;
  products: PurchaseProduct[];
};

export default function PurchaseCreateLoadScreen() {
  const { tripId, loadId } = useLocalSearchParams<{ tripId?: string; loadId?: string }>();
  const [bootstrap, setBootstrap] = useState<PurchaseBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<CounterMap>({});
  const [editingLoadId, setEditingLoadId] = useState<number | null>(null);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const data = await getPurchaseBootstrap();
        setBootstrap(data);

        if (loadId) {
          const detail = await getPurchaseLoadDetail(loadId);

          setEditingLoadId(detail.id);

          const nextCounts: CounterMap = {};
          for (const item of detail.items || []) {
            nextCounts[item.productId] = Number(item.quantity || 0);
          }
          setCounts(nextCounts);
        }
      } catch (error) {
        console.log('Purchase bootstrap error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBootstrap();
  }, [loadId]);

  const productSections = useMemo<ProductSection[]>(() => {
    if (!bootstrap) {
      return [];
    }

    return [
      { title: 'Domestic Cylinders', products: bootstrap.products.domestic },
      { title: 'Commercial Cylinders', products: bootstrap.products.commercial },
    ];
  }, [bootstrap]);

  const allProducts = useMemo(
    () => productSections.flatMap((section) => section.products),
    [productSections]
  );

  const totalQuantity = allProducts.reduce(
    (sum, product) => sum + Number(counts[product.id] || 0),
    0
  );

  const updateCount = (productId: number, nextValue: number) => {
    setCounts((prev) => ({
      ...prev,
      [productId]: Math.max(nextValue, 0),
    }));
  };

  const updateCountFromInput = (productId: number, value: string) => {
    const normalizedValue = value.replace(/[^0-9]/g, '');
    updateCount(productId, normalizedValue ? Number(normalizedValue) : 0);
  };

  const handleSave = async () => {
    if (!bootstrap || !tripId || totalQuantity <= 0) {
      return;
    }

    try {
      setSaving(true);
      const payload = allProducts
        .map((product) => ({
          productId: product.id,
          quantity: Number(counts[product.id] || 0),
        }))
        .filter((item) => item.quantity > 0);

      const stockAreaId = bootstrap.defaultStockArea?.id ?? null;

      const load = editingLoadId
        ? await updatePurchaseLoad(editingLoadId, {
            stockAreaId,
            items: payload,
          })
        : await createPurchaseLoad({
            tripId: Number(tripId),
            createdBy: bootstrap.manager.id,
            stockAreaId,
            items: payload,
          });

      DeviceEventEmitter.emit('PURCHASE_FLOW_UPDATED');
      router.replace(`/purchase/load/${load.id}` as any);
    } catch (error) {
      console.log('Create purchase load error:', error);

      if (isAxiosError(error) && error.response?.data?.message) {
        Alert.alert('Unable to save load', String(error.response.data.message));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={DS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.overlay} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{editingLoadId ? 'Edit Load' : 'Create Load'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={20} color={DS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollBody}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.noticeCard}>
            <Ionicons name="layers-outline" size={18} color={DS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>SINGLE LOAD, MIXED CATEGORIES</Text>
              <Text style={styles.noticeText}>
                You can add Domestic and Commercial products in the same load. Enter quantities directly for any item you need.
              </Text>
            </View>
          </View>

          {productSections.map((section) => (
            <View key={section.title} style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>{section.title}</Text>

              {section.products.map((product) => {
                const count = Number(counts[product.id] || 0);

                return (
                  <View key={product.id} style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category}</Text>
                    </View>

                    <TextInput
                      value={count > 0 ? String(count) : ''}
                      onChangeText={(value) => updateCountFromInput(product.id, value)}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="#94A3B8"
                      style={styles.countInput}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL CYLINDERS</Text>
          <Text style={styles.totalValue}>{totalQuantity}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.saveButton,
            totalQuantity <= 0 || saving ? styles.saveButtonDisabled : null,
          ]}
          disabled={totalQuantity <= 0 || saving}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : editingLoadId ? 'Update Load' : 'Save Load'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderScreen: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.22)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.26)',
  },
  sheet: {
    backgroundColor: DS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    padding: 20,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  sheetTitle: {
    ...TYPO.h5,
    color: DS.textPrimary,
  },
  sectionLabel: {
    ...EYEBROW,
    color: DS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  sheetScroll: {
    marginBottom: 10,
  },
  sheetScrollBody: {
    paddingBottom: 8,
  },
  noticeCard: {
    marginBottom: 18,
    backgroundColor: DS.primarySoft,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.primarySoftBorder,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  noticeTitle: {
    ...EYEBROW,
    color: DS.primary,
    letterSpacing: 0.6,
  },
  noticeText: {
    ...TYPO.c1,
    color: DS.textSecondary,
    marginTop: 4,
  },
  sectionBlock: {
    marginBottom: 18,
  },
  productRow: {
    backgroundColor: DS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: DS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productInfo: {
    flex: 1,
    paddingRight: 12,
  },
  productName: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  productCategory: {
    ...TYPO.c1,
    color: DS.textSecondary,
    marginTop: 2,
  },
  countInput: {
    width: 74,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: DS.border,
    backgroundColor: DS.surface,
    color: DS.textPrimary,
    fontSize: 16,
    fontWeight: WEIGHT.semibold,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 18,
  },
  totalLabel: {
    ...EYEBROW,
    color: DS.textTertiary,
    letterSpacing: 0.8,
  },
  totalValue: {
    ...TYPO.h5,
    color: DS.textPrimary,
  },
  saveButton: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: DS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: PALETTE.primary200,
  },
  saveButtonText: {
    ...TYPO.s2,
    color: DS.white,
  },
});