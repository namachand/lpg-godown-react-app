import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';

const sales = [
  {
    id: 1,
    name: 'Ravi Kumar',
    type: 'Domestic',
    detail: '1 × 14.2 kg · INV-1041 · 9:42 AM',
    qty: 1,
  },
  {
    id: 2,
    name: 'Hotel Surya',
    type: 'Commercial',
    detail: '2 × 19 kg · INV-1042 · 10:15 AM',
    qty: 2,
  },
  {
    id: 3,
    name: 'Anita Sharma',
    type: 'Domestic',
    detail: '1 × 14.2 kg · INV-1043 · 10:48 AM',
    qty: 1,
  },
  {
    id: 4,
    name: 'Cafe Mocha',
    type: 'Commercial',
    detail: '3 × 5 kg · INV-1044 · 11:20 AM',
    qty: 3,
  },
  {
    id: 5,
    name: 'Manoj Patel',
    type: 'Domestic',
    detail: '2 × 14.2 kg · INV-1045 · 12:05 PM',
    qty: 2,
  },
];

export default function GodownCashierSaleScreen() {
  return (
    <ScreenContainer>
      <AppHeader />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View>
            <Text style={styles.pageTitle}>Cashier Sale Stock</Text>
            <Text style={styles.pageSub}>7 sales recorded</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <View style={styles.totalTop}>
            <Ionicons name="receipt-outline" size={16} color={COLORS.white} />
            <Text style={styles.totalLabel}>TOTAL SALES</Text>
          </View>

          <Text style={styles.totalText}>7 orders</Text>

          <View style={styles.cylinderRow}>
            <Ionicons name="cube-outline" size={14} color={COLORS.white} />
            <Text style={styles.cylinderText}>11 cylinders</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.blueSoft }]}>
              <Ionicons name="cube-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryLabel}>DOMESTIC</Text>
            <Text style={styles.summaryValue}>5 cylinders</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: COLORS.orangeSoft }]}>
              <Ionicons name="cube-outline" size={18} color={COLORS.orange} />
            </View>
            <Text style={styles.summaryLabel}>COMMERCIAL</Text>
            <Text style={styles.summaryValue}>6 cylinders</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Sale Transactions</Text>

        <View style={styles.salesCard}>
          {sales.map((item, index) => {
            const commercial = item.type === 'Commercial';

            return (
              <View
                key={item.id}
                style={[
                  styles.saleRow,
                  index !== sales.length - 1 && styles.saleRowBorder,
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: commercial
                        ? COLORS.orangeSoft
                        : COLORS.blueSoft,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={commercial ? COLORS.orange : COLORS.primary}
                  />
                </View>

                <View style={styles.saleMiddle}>
                  <View style={styles.nameRow}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <View
                      style={[
                        styles.typeBadge,
                        {
                          backgroundColor: commercial
                            ? COLORS.orangeSoft
                            : COLORS.blueSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeText,
                          {
                            color: commercial
                              ? COLORS.orange
                              : COLORS.primary,
                          },
                        ]}
                      >
                        {item.type}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.saleDetail}>{item.detail}</Text>
                </View>

                <View style={styles.qtyBox}>
                  <Text style={styles.qty}>{item.qty}</Text>
                  <Text style={styles.qtyLabel}>qty</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  pageSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  totalCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  totalTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  totalText: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.white,
    marginBottom: 8,
  },
  cylinderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cylinderText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  salesCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saleRow: {
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  saleMiddle: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  saleDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  qtyBox: {
    alignItems: 'center',
    marginLeft: 8,
  },
  qty: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  qtyLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '800',
  },
});