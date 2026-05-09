import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS } from '../../constants/colors';

type Denominations = {
  "500": number;
  "100": number;
  "50": number;
  "20": number;
  "10": number;
  coins: number;
};

type Props = {
  visible: boolean;
  expectedAmount: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    denominations: Denominations;
    enteredAmount: number;
  }) => void;
};

const initialValues: Denominations = {
  "500": 0,
  "100": 0,
  "50": 0,
  "20": 0,
  "10": 0,
  coins: 0,
};

export default function CashDenominationModal({
  visible,
  expectedAmount,
  loading = false,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<Denominations>(initialValues);

  useEffect(() => {
    if (visible) {
      setValues(initialValues);
    }
  }, [visible]);

  const enteredAmount = useMemo(() => {
    return (
      values["500"] * 500 +
      values["100"] * 100 +
      values["50"] * 50 +
      values["20"] * 20 +
      values["10"] * 10 +
      values.coins
    );
  }, [values]);

  const updateCount = (key: keyof Denominations, next: number) => {
    setValues((prev) => ({
      ...prev,
      [key]: Math.max(0, next),
    }));
  };

  const rows: Array<{ key: keyof Denominations; label: string }> = [
    { key: "500", label: "₹500" },
    { key: "100", label: "₹100" },
    { key: "50", label: "₹50" },
    { key: "20", label: "₹20" },
    { key: "10", label: "₹10" },
    { key: "coins", label: "Coins" },
  ];

  const renderAmount = (key: keyof Denominations) => {
    if (key === 'coins') return values.coins;
    return Number(key) * values[key];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <View style={styles.handle} />

              <View style={styles.headerRow}>
                <Text style={styles.title}>Cash Denomination</Text>
                <Text style={styles.totalText}>Total: ₹{enteredAmount}</Text>
              </View>

              <Text style={styles.subtitle}>
                Enter the count of each denomination to settle cash collection.
              </Text>

              {rows.map((row) => (
                <View key={row.key} style={styles.row}>
                  <Text style={styles.label}>{row.label}</Text>

                  <View style={styles.counterWrap}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => updateCount(row.key, values[row.key] - 1)}
                    >
                      <Text style={styles.counterBtnText}>-</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={String(values[row.key])}
                      onChangeText={(text) =>
                        updateCount(row.key, Number(text || 0))
                      }
                    />

                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => updateCount(row.key, values[row.key] + 1)}
                    >
                      <Text style={styles.counterBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.rowAmount}>₹{renderAmount(row.key)}</Text>
                </View>
              ))}

              <View style={styles.summaryBox}>
                <Text style={styles.expectedText}>Expected: ₹{expectedAmount}</Text>
                <Text style={styles.enteredText}>Entered: ₹{enteredAmount}</Text>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabled]}
                disabled={loading}
                onPress={() => onSubmit({ denominations: values, enteredAmount })}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="wallet-outline"
                      size={18}
                      color={COLORS.white}
                    />
                    <Text style={styles.submitText}>
                      Settle Cash — ₹{enteredAmount}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
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
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    width: 60,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  counterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  input: {
    width: 54,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  rowAmount: {
    width: 56,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  summaryBox: {
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: COLORS.orangeSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expectedText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.orange,
  },
  enteredText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.orange,
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.buttonGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.7,
  },
});