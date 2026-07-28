import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, ScrollView } from 'react-native';
import { DS, TYPO, EYEBROW, RADIUS } from '../constants/designSystem';

export type DayWiseSummaryItem = {
  date: string;
  allocated: number;
  delivered: number;
  inHand: number;
  // Cylinders still held by the driver when the day opened, carried over from
  // earlier days and counted towards that day's total allocation.
  carriedForward?: number;
  totalAllocated?: number;
  returned?: number;
};

interface DriverDayWiseSummaryModalProps {
  visible: boolean;
  driverName?: string;
  loading?: boolean;
  data?: DayWiseSummaryItem[];
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export default function DriverDayWiseSummaryModal({
  visible,
  driverName = 'Driver',
  loading = false,
  data = [],
  onClose,
}: DriverDayWiseSummaryModalProps) {
  const totals = data.reduce(
    (acc, item) => ({
      allocated: acc.allocated + item.allocated,
      delivered: acc.delivered + item.delivered,
      inHand: acc.inHand + item.inHand,
    }),
    { allocated: 0, delivered: 0, inHand: 0 }
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.container}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{driverName}</Text>
              <Text style={styles.headerSubtitle}>Day-wise Summary</Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={DS.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={DS.primary} />
              <Text style={styles.loaderText}>Loading summary...</Text>
            </View>
          ) : data.length > 0 ? (
            <>
              {/* Totals Card */}
              <View style={styles.totalsCard}>
                <Text style={styles.totalsTitle}>TOTAL SUMMARY</Text>
                <View style={styles.totalsGrid}>
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: DS.primary }]}>
                      {totals.allocated}
                    </Text>
                    <Text style={styles.totalLabel}>Allocated</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: DS.green }]}>
                      {totals.delivered}
                    </Text>
                    <Text style={styles.totalLabel}>Delivered</Text>
                  </View>
                  <View style={styles.totalItem}>
                    <Text style={[styles.totalValue, { color: DS.orange }]}>
                      {totals.inHand}
                    </Text>
                    <Text style={styles.totalLabel}>In-Hand</Text>
                  </View>
                </View>
              </View>

              {/* Day-wise Items */}
              <ScrollView style={styles.itemsContainer} showsVerticalScrollIndicator={false}>
                {data.map((item, index) => (
                  <View key={index} style={styles.dayCard}>
                    <View style={styles.dayDateRow}>
                      <Ionicons name="calendar-outline" size={16} color={DS.textSecondary} />
                      <Text style={styles.dayDate}>{formatDate(item.date)}</Text>
                    </View>

                    <View style={styles.dayStatsRow}>
                      <View style={styles.dayStatItem}>
                        <Text style={styles.dayStatLabel}>Allocated</Text>
                        <Text style={[styles.dayStatValue, { color: DS.primary }]}>
                          {item.allocated}
                        </Text>
                      </View>

                      <View style={styles.dayStatDivider} />

                      <View style={styles.dayStatItem}>
                        <Text style={styles.dayStatLabel}>Delivered</Text>
                        <Text style={[styles.dayStatValue, { color: DS.green }]}>
                          {item.delivered}
                        </Text>
                      </View>

                      <View style={styles.dayStatDivider} />

                      <View style={styles.dayStatItem}>
                        <Text style={styles.dayStatLabel}>In-Hand</Text>
                        <Text style={[styles.dayStatValue, { color: DS.orange }]}>
                          {item.inHand}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="calendar-clear-outline" size={48} color={DS.textSecondary} />
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: DS.card,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: DS.border,
  },
  headerTitle: {
    ...TYPO.s1,
    color: DS.textPrimary,
    marginBottom: 2,
  },
  headerSubtitle: {
    ...TYPO.c1,
    color: DS.textSecondary,
  },
  closeButton: {
    padding: 8,
  },
  loaderBox: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    ...TYPO.b3,
    color: DS.textSecondary,
  },
  totalsCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: DS.primarySoft,
    borderRadius: RADIUS.lg,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: DS.primary,
  },
  totalsTitle: {
    ...EYEBROW,
    color: DS.textSecondary,
    marginBottom: 10,
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalValue: {
    ...TYPO.s1,
    marginBottom: 4,
  },
  totalLabel: {
    ...TYPO.c1,
    color: DS.textSecondary,
  },
  itemsContainer: {
    marginHorizontal: 16,
    marginTop: 14,
    maxHeight: '65%',
  },
  dayCard: {
    backgroundColor: DS.card,
    borderWidth: 1,
    borderColor: DS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 10,
  },
  dayDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: DS.divider,
  },
  dayDate: {
    ...TYPO.b4,
    color: DS.textPrimary,
  },
  dayStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  dayStatLabel: {
    ...TYPO.c3,
    color: DS.textSecondary,
    marginBottom: 4,
  },
  dayStatValue: {
    ...TYPO.s2,
  },
  dayStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: DS.divider,
    marginHorizontal: 8,
  },
  emptyBox: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    ...TYPO.b3,
    color: DS.textSecondary,
  },
});
