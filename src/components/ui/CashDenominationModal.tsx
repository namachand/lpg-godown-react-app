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
import { DS, TYPO, RADIUS } from '../../constants/designSystem';

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
                  <ActivityIndicator color={DS.white} />
                ) : (
                  <>
                    <Ionicons
                      name="wallet-outline"
                      size={18}
                      color={DS.white}
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
    backgroundColor: DS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: DS.borderStrong,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...TYPO.s2,
    color: DS.textPrimary,
  },
  totalText: {
    ...TYPO.s2,
    color: DS.primary,
  },
  subtitle: {
    ...TYPO.c1,
    color: DS.textSecondary,
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
    ...TYPO.s2,
    color: DS.textPrimary,
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
    borderRadius: RADIUS.sm,
    backgroundColor: DS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    ...TYPO.s1,
    color: DS.textPrimary,
  },
  input: {
    width: 54,
    height: 34,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: DS.border,
    textAlign: 'center',
    ...TYPO.s2,
    color: DS.textPrimary,
    backgroundColor: DS.card,
  },
  rowAmount: {
    width: 56,
    textAlign: 'right',
    ...TYPO.b4,
    color: DS.textSecondary,
  },
  summaryBox: {
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: DS.orangeSoft,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expectedText: {
    ...TYPO.b4,
    color: DS.orangeText,
  },
  enteredText: {
    ...TYPO.b4,
    color: DS.orangeText,
  },
  submitBtn: {
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: DS.buttonGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    ...TYPO.s2,
    color: DS.white,
  },
  disabled: {
    opacity: 0.7,
  },
});