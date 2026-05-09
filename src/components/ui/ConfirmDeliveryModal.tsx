import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

type PaymentMethod = 'CASH' | 'UPI' | 'ONLINE' | 'CREDIT';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    payment_method: PaymentMethod;
    empty_cylinder_qty: number;
  }) => void;
  loading?: boolean;
  sale: {
    customerName: string;
    address: string;
    product: string;
    quantity: number;
    totalAmount: number;
  } | null;
};

export default function ConfirmDeliveryModal({
  visible,
  onClose,
  onSubmit,
  loading = false,
  sale,
}: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [emptyQty, setEmptyQty] = useState(1);

  useEffect(() => {
    if (visible) {
      setPaymentMethod('CASH');
      setEmptyQty(1);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Confirm Delivery</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {sale ? (
            <>
              <View style={styles.infoCard}>
                <Text style={styles.name}>{sale.customerName}</Text>
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.address}>{sale.address}</Text>
                </View>
                <Text style={styles.meta}>
                  {sale.product} · Qty: {sale.quantity} · {sale.totalAmount}
                </Text>
              </View>

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.paymentRow}>
                {(['CASH', 'UPI', 'ONLINE', 'CREDIT'] as PaymentMethod[]).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.payBtn,
                      paymentMethod === method && styles.payBtnActive,
                    ]}
                    onPress={() => setPaymentMethod(method)}
                  >
                    <Text
                      style={[
                        styles.payText,
                        paymentMethod === method && styles.payTextActive,
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
                value={String(sale.totalAmount)}
                editable={false}
              />

              <Text style={styles.label}>Empty Cylinders Collected</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setEmptyQty((prev) => Math.max(0, prev - 1))}
                >
                  <Text style={styles.qtyBtnText}>-</Text>
                </TouchableOpacity>

                <View style={styles.qtyValueBox}>
                  <Text style={styles.qtyValue}>{emptyQty}</Text>
                </View>

                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setEmptyQty((prev) => prev + 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabled]}
                disabled={loading}
                onPress={() =>
                  onSubmit({
                    payment_method: paymentMethod,
                    empty_cylinder_qty: emptyQty,
                  })
                }
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                    <Text style={styles.submitText}>Save & Mark Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  address: {
    marginLeft: 4,
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  meta: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  payBtn: {
    minWidth: 68,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  payText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  payTextActive: {
    color: COLORS.white,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F9FAFB',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  qtyBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qtyValueBox: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.buttonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
});