import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/common/AppHeader';
import ScreenContainer from '../../components/common/ScreenContainer';
import { COLORS } from '../../constants/colors';
import {
  approveStockOutLoad,
  getStockOutLoadDetail,
} from '../../services/godownService';

export default function GodownLoadOutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loadData, setLoadData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  const fetchLoadDetail = async () => {
    try {
      setLoading(true);
      const data = await getStockOutLoadDetail(id);
      setLoadData(data);
    } catch (error) {
      console.log('Stock out detail error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoadDetail();
  }, [id]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      await approveStockOutLoad(id);
      DeviceEventEmitter.emit('STOCK_OUT_APPROVED', Number(id));
      DeviceEventEmitter.emit('NEW_STOCK_OUT');
      DeviceEventEmitter.emit('NEW_DEFECTIVE');
      router.back();
    } catch (error) {
      console.log('Approve stock out error:', error);
    } finally {
      setApproving(false);
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

  if (!loadData) {
    return (
      <ScreenContainer>
        <AppHeader />
        <View style={styles.content}>
          <Text>No load data found</Text>
        </View>
      </ScreenContainer>
    );
  }

  const emptyTotal = Number(loadData.empty_qty || 0);
  const defectiveTotal = Number(loadData.defective_qty || 0);
  const approveTotal = Number(loadData.qty || emptyTotal + defectiveTotal);

  return (
    <ScreenContainer>
      <AppHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={23} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.titleBox}>
            <Text style={styles.title}>{loadData.load}</Text>
            <Text style={styles.date}>23 Apr 2025</Text>
          </View>

          <View style={styles.totalBox}>
            <Text style={styles.totalValue}>{approveTotal}</Text>
            <Text style={styles.totalLabel}>CYLINDERS</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <InfoRow icon="car-outline" label="VEHICLE" value={loadData.vehicle} />
          <InfoRow icon="person-outline" label="DRIVER" value={loadData.driver} />
          <InfoRow icon="cube-outline" label="DEPOT" value={loadData.depot} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ITEM-WISE STOCK</Text>

          <TouchableOpacity style={styles.editPill}>
            <Ionicons name="pencil-outline" size={14} color={COLORS.textPrimary} />
            <Text style={styles.editText}>EDIT</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableCard}>
          <View style={styles.tableHead}>
            <Text style={styles.tableHeadText}>ITEM</Text>
            <Text style={styles.tableHeadText}>QTY</Text>
          </View>

          {loadData.items?.map((item: any) => (
            <StockRow
              key={`empty-${item.transaction_id}`}
              label={`${item.item} Empty (${item.type})`}
              value={item.quantity}
            />
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalRowText}>TOTAL EMPTIES</Text>
            <Text style={styles.totalRowValue}>{emptyTotal}</Text>
          </View>
        </View>

        {loadData.defective_items?.length > 0 && (
          <>
            <View style={styles.defectiveTopHeader}>
              <View style={styles.defectiveTitleLeft}>
                <Ionicons name="warning-outline" size={15} color="#EF4444" />
                <Text style={styles.defectiveTopTitle}>DEFECTIVE ITEMS</Text>
              </View>

              <Text style={styles.defectiveTopTotal}>
                {defectiveTotal} TOTAL
              </Text>
            </View>

            <View style={styles.defectiveTableCard}>
              <View style={styles.defectiveTableHead}>
                <Text style={styles.defectiveHeadText}>DEFECTIVE ITEM</Text>
                <Text style={styles.defectiveHeadText}>QTY</Text>
              </View>

              {loadData.defective_items.map((item: any) => (
                <StockRow
                  key={`defective-${item.transaction_id}`}
                  label={`${item.item} Defective (${item.type})`}
                  value={item.quantity}
                  danger
                />
              ))}

              <View style={styles.defectiveTotalRow}>
                <Text style={styles.defectiveTotalText}>TOTAL DEFECTIVES</Text>
                <Text style={styles.defectiveTotalValue}>
                  {defectiveTotal}
                </Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitleSmall}>INVOICE DETAILS</Text>

        <View style={styles.invoiceCard}>
          <View style={styles.invoiceRow}>
            <View style={styles.invoiceLeft}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.invoiceLabel}>Invoice No.</Text>
            </View>

            <Text style={styles.invoiceValue}>{loadData.invoice}</Text>
          </View>

          <View style={styles.invoiceRow}>
            <View style={styles.invoiceLeft}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.invoiceLabel}>Invoice Date</Text>
            </View>

            <Text style={styles.invoiceValue}>23 Apr 2025</Text>
          </View>
        </View>

        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitleSmall}>INVOICE PHOTO</Text>

          <TouchableOpacity style={styles.downloadPill}>
            <Ionicons name="download-outline" size={14} color={COLORS.textPrimary} />
            <Text style={styles.downloadText}>DOWNLOAD</Text>
          </TouchableOpacity>
        </View>

        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=900&auto=format&fit=crop',
          }}
          style={styles.invoiceImage}
        />
      </ScrollView>

      <View style={styles.bottomAction}>
        <TouchableOpacity
          style={[
            styles.approveButton,
            loadData.status === 'APPROVED' && styles.approvedButton,
          ]}
          onPress={handleApprove}
          disabled={approving || loadData.status === 'APPROVED'}
        >
          <Ionicons name="checkmark" size={18} color={COLORS.white} />

          <Text style={styles.approveText}>
            {loadData.status === 'APPROVED'
              ? 'Approved'
              : approving
              ? 'Approving...'
              : `Approve All Stock (${approveTotal})`}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={23} color={COLORS.primary} />
      </View>

      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function StockRow({ label, value, danger }: any) {
  return (
    <View style={[styles.stockRow, danger && styles.defectiveStockRow]}>
      <Text style={[styles.stockLabel, danger && styles.defectiveStockLabel]}>
        {label}
      </Text>

      <Text style={[styles.stockValue, danger && styles.defectiveStockValue]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderBox: {
    height: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 170,
  },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  titleBox: {
    flex: 1,
    marginLeft: 18,
  },

  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  totalBox: {
    alignItems: 'flex-end',
  },

  totalValue: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  totalLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },

  infoCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  infoLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },

  sectionTitleSmall: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 18,
  },

  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  editText: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  tableCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },

  tableHead: {
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  tableHeadText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.textSecondary,
  },

  stockRow: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stockLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flex: 1,
  },

  stockValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginLeft: 12,
  },

  totalRow: {
    minHeight: 52,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  totalRowText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  totalRowValue: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },

  defectiveTopHeader: {
    marginTop: 18,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  defectiveTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  defectiveTopTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },

  defectiveTopTotal: {
    fontSize: 11,
    fontWeight: '900',
    color: '#EF4444',
  },

  defectiveTableCard: {
    backgroundColor: '#FFF7F7',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    overflow: 'hidden',
  },

  defectiveTableHead: {
    backgroundColor: '#FFF7F7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },

  defectiveHeadText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#EF4444',
    letterSpacing: 0.7,
  },

  defectiveStockRow: {
    backgroundColor: '#FFF7F7',
    borderBottomColor: '#FECACA',
  },

  defectiveStockLabel: {
    color: COLORS.textPrimary,
  },

  defectiveStockValue: {
    color: '#EF4444',
  },

  defectiveTotalRow: {
    minHeight: 52,
    backgroundColor: '#FFF7F7',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#FECACA',
  },

  defectiveTotalText: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  defectiveTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#EF4444',
  },

  invoiceCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },

  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  invoiceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  invoiceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  downloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  downloadText: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },

  invoiceImage: {
    height: 190,
    borderRadius: 10,
    marginTop: 8,
  },

  bottomAction: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 72,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  approveButton: {
    height: 58,
    backgroundColor: COLORS.green,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  approvedButton: {
    opacity: 0.75,
  },

  approveText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
  },
});